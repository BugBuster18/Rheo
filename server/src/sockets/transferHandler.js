/**
 * DropShare — Transfer Socket Handler
 *
 * Handles: transfer request, accept, reject, cancel.
 * Chunk transfer is handled in chunkHandler.js.
 *
 * Flow:
 *   Sender emits TRANSFER_REQUEST
 *     → Server validates, creates DB records
 *     → Server routes request to receiver (cross-instance via Redis if needed)
 *   Receiver emits TRANSFER_ACCEPT
 *     → Server marks transfer ACCEPTED
 *     → Server emits TRANSFER_START to sender
 *   Sender begins sending CHUNKs (see chunkHandler.js)
 */

'use strict';

const { SOCKET_EVENTS, TRANSFER_STATUS } = require('../constants');
const transferService = require('../services/transferService');
const transferManager = require('../transfer/TransferManager');
const { isUserOnline, getUserPresence } = require('../redis/presence');
const { transferEvents } = require('../redis/pubsub');
const { findSocketByUserId } = require('./index');
const logger = require('../utils/logger');
const config = require('../config/env');

function register(io, socket) {
  // ── TRANSFER_REQUEST ──────────────────────────────────────────
  socket.on(SOCKET_EVENTS.TRANSFER_REQUEST, async (data, callback) => {
    const senderId = socket.userId; // Derived from JWT — never trust data.senderId

    try {
      const { fileName, fileSize, fileHash, totalChunks, receiverIds } = data;

      // Basic validation
      if (!Array.isArray(receiverIds) || receiverIds.length === 0) {
        return ack(callback, false, 'No receivers specified');
      }
      if (fileSize > config.MAX_FILE_SIZE_BYTES) {
        return ack(callback, false, 'File exceeds maximum allowed size');
      }
      // Prevent a user from sending to themselves
      if (receiverIds.includes(senderId)) {
        return ack(callback, false, 'Cannot send to yourself');
      }

      // Create group + one transfer per receiver in PostgreSQL
      const { groupId, transfers } = await transferService.createTransferGroup({
        senderId,
        fileName,
        fileSize,
        totalChunks,
        fileHash,
        receiverIds,
      });

      logger.info('TRANSFER_REQUEST created', { senderId, groupId, receivers: receiverIds.length });

      // Route the request to each receiver (possibly on a different EC2 instance)
      for (const transfer of transfers) {
        const requestPayload = {
          transferId:  transfer.id,
          groupId,
          senderId,
          senderUsername: socket.handshake.auth?.username, // set during login
          fileName,
          fileSize,
          totalChunks,
          fileHash,
        };

        await routeEventToUser(io, transfer.receiver_id, SOCKET_EVENTS.TRANSFER_REQUEST, requestPayload);
      }

      ack(callback, true, 'Transfer request sent', { groupId, transfers });
    } catch (err) {
      logger.error('TRANSFER_REQUEST error', { senderId, error: err.message });
      ack(callback, false, 'Failed to create transfer request');
    }
  });

  // ── TRANSFER_ACCEPT ───────────────────────────────────────────
  socket.on(SOCKET_EVENTS.TRANSFER_ACCEPT, async (data, callback) => {
    const receiverId = socket.userId;
    const { transferId } = data;

    try {
      const { authorized, transfer, reason } = await transferService.verifyTransferAuthorization(
        transferId, receiverId, 'receiver'
      );
      if (!authorized) {
        return ack(callback, false, reason || 'Unauthorized');
      }
      if (transfer.status !== TRANSFER_STATUS.PENDING) {
        return ack(callback, false, `Transfer is already ${transfer.status}`);
      }

      // Mark accepted in DB
      await transferService.updateTransferStatus(transferId, TRANSFER_STATUS.ACCEPTED);

      // Register in-memory state for the active transfer
      transferManager.createActiveTransfer({
        transferId,
        groupId:     transfer.group_id,
        senderId:    transfer.sender_id,
        receiverId,
        fileName:    transfer.file_name,
        fileSize:    transfer.file_size,
        totalChunks: transfer.total_chunks,
        fileHash:    transfer.file_hash,
        lastConfirmedChunk: transfer.last_confirmed_chunk,
      });

      logger.info('Transfer accepted', { transferId, receiverId });

      // Tell sender to start sending chunks
      await routeEventToUser(io, transfer.sender_id, SOCKET_EVENTS.TRANSFER_START, {
        transferId,
        receiverId,
        lastConfirmedChunk: transfer.last_confirmed_chunk,
      });

      ack(callback, true, 'Transfer accepted');
    } catch (err) {
      logger.error('TRANSFER_ACCEPT error', { receiverId, transferId, error: err.message });
      ack(callback, false, 'Failed to accept transfer');
    }
  });

  // ── TRANSFER_REJECT ───────────────────────────────────────────
  socket.on(SOCKET_EVENTS.TRANSFER_REJECT, async (data, callback) => {
    const receiverId = socket.userId;
    const { transferId } = data;

    try {
      const { authorized, transfer, reason } = await transferService.verifyTransferAuthorization(
        transferId, receiverId, 'receiver'
      );
      if (!authorized) return ack(callback, false, reason || 'Unauthorized');

      await transferService.updateTransferStatus(transferId, TRANSFER_STATUS.REJECTED);
      logger.info('Transfer rejected', { transferId, receiverId });

      await routeEventToUser(io, transfer.sender_id, SOCKET_EVENTS.TRANSFER_REJECT, { transferId, receiverId });
      ack(callback, true, 'Transfer rejected');
    } catch (err) {
      logger.error('TRANSFER_REJECT error', { receiverId, transferId, error: err.message });
      ack(callback, false, 'Failed to reject transfer');
    }
  });

  // ── TRANSFER_CANCEL ───────────────────────────────────────────
  socket.on(SOCKET_EVENTS.TRANSFER_CANCEL, async (data, callback) => {
    const userId = socket.userId;
    const { transferId } = data;

    try {
      const { authorized, transfer, reason } = await transferService.verifyTransferAuthorization(
        transferId, userId, 'any'
      );
      if (!authorized) return ack(callback, false, reason || 'Unauthorized');

      await transferService.updateTransferStatus(transferId, TRANSFER_STATUS.CANCELLED);
      transferManager.removeActiveTransfer(transferId);
      logger.info('Transfer cancelled', { transferId, cancelledBy: userId });

      // Notify the other party
      const otherUserId = userId === transfer.sender_id ? transfer.receiver_id : transfer.sender_id;
      await routeEventToUser(io, otherUserId, SOCKET_EVENTS.TRANSFER_CANCEL_ACK, {
        transferId,
        cancelledBy: userId,
      });

      ack(callback, true, 'Transfer cancelled');
    } catch (err) {
      logger.error('TRANSFER_CANCEL error', { userId, transferId, error: err.message });
      ack(callback, false, 'Failed to cancel transfer');
    }
  });
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Route an event to a specific user.
 * If connected locally: emit directly.
 * If on another instance: publish via Redis Pub/Sub.
 */
async function routeEventToUser(io, targetUserId, eventName, payload) {
  const localSocket = findSocketByUserId(io, targetUserId);
  if (localSocket) {
    localSocket.emit(eventName, payload);
    return;
  }

  // User may be on another Node.js instance — publish via Redis
  const userOnline = await isUserOnline(targetUserId);
  if (userOnline) {
    await transferEvents.publish(eventName, {
      targetUserId,
      payload,
    });
  } else {
    logger.info('Target user is offline, event not delivered', { targetUserId, eventName });
  }
}

function ack(callback, success, message, data) {
  if (typeof callback === 'function') {
    callback({ success, message, data });
  }
}

module.exports = { register, routeEventToUser };
