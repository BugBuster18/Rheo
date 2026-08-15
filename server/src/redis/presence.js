/**
 * DropShare — User Presence Service (Redis-backed)
 *
 * Tracks which users are currently connected via WebSocket.
 *
 * Why Redis instead of in-memory?
 *   With multiple Node.js instances:
 *     EC2-1 knows Ganesh is connected (his socket is here)
 *     EC2-2 knows Rahul is connected (his socket is there)
 *   But EC2-1 doesn't know about Rahul unless we use a shared store.
 *   Redis provides that shared, low-latency presence store.
 *
 * Storage structure:
 *   Key:   presence:<userId>
 *   Value: JSON { socketId, instanceId, connectedAt }
 *   TTL:   set on disconnect, auto-expires stale entries
 */

'use strict';

const { redisClient } = require('../config/redis');
const logger = require('../utils/logger');

const PRESENCE_PREFIX = 'presence:';
const PRESENCE_TTL_SECONDS = 30; // Auto-expire stale entries

/**
 * Mark a user as online in Redis.
 * @param {string} userId   - User's UUID
 * @param {string} socketId - Socket.IO socket ID on this instance
 */
async function setUserOnline(userId, socketId) {
  const key = PRESENCE_PREFIX + userId;
  const value = JSON.stringify({
    socketId,
    instanceId: process.env.INSTANCE_ID || process.pid.toString(),
    connectedAt: Date.now(),
  });
  // No TTL on online — we clear it explicitly on disconnect
  await redisClient.set(key, value);
  logger.info('User came online', { userId, socketId });
}

/**
 * Mark a user as offline — remove from Redis.
 * @param {string} userId
 */
async function setUserOffline(userId) {
  const key = PRESENCE_PREFIX + userId;
  await redisClient.del(key);
  logger.info('User went offline', { userId });
}

/**
 * Check if a user is currently online.
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function isUserOnline(userId) {
  const key = PRESENCE_PREFIX + userId;
  const exists = await redisClient.exists(key);
  return exists === 1;
}

/**
 * Get online status for multiple users at once.
 * @param {string[]} userIds
 * @returns {Promise<Object>} Map of { userId: boolean }
 */
async function getBulkPresence(userIds) {
  if (!userIds || userIds.length === 0) return {};

  const pipeline = redisClient.pipeline();
  for (const userId of userIds) {
    pipeline.exists(PRESENCE_PREFIX + userId);
  }
  const results = await pipeline.exec();

  const presence = {};
  userIds.forEach((userId, index) => {
    presence[userId] = results[index][1] === 1;
  });
  return presence;
}

/**
 * Get presence data for a user (includes socketId, instanceId).
 * Returns null if user is offline.
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
async function getUserPresence(userId) {
  const key = PRESENCE_PREFIX + userId;
  const raw = await redisClient.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

module.exports = {
  setUserOnline,
  setUserOffline,
  isUserOnline,
  getBulkPresence,
  getUserPresence,
};
