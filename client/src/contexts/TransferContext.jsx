/**
 * DropShare — Transfer Context
 *
 * Central state for ALL active transfers (sending + receiving).
 * Also handles Socket.IO event wiring for transfer events.
 *
 * Provides:
 *   transfers          - Map<transferId, TransferInfo>
 *   pendingRequests    - Array of incoming transfer requests
 *   sendFile(file, receiverIds) - initiate a transfer
 *   acceptTransfer(transferId)
 *   rejectTransfer(transferId)
 *   cancelTransfer(transferId)
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';
import { computeFileHash, computeTotalChunks, readChunk, formatBytes } from '../utils/fileUtils';

// Max chunks in-flight (application-level backpressure)
const MAX_IN_FLIGHT = 4;
const CHUNK_SIZE = 1024 * 1024; // 1 MB

const TransferContext = createContext(null);

export function TransferProvider({ children }) {
  const { user, isAuthenticated } = useAuth();

  // Map<transferId, transferObj>
  const [transfers, setTransfers]           = useState(new Map());
  // Incoming requests waiting for accept/reject
  const [pendingRequests, setPendingRequests] = useState([]);
  // Map<transferId, { file, inFlight, nextChunkToSend, active }>
  const senderState = useRef(new Map());
  // Map<transferId, { chunks: [], nextExpected }> for receiver reassembly
  const receiverState = useRef(new Map());

  // ── Helpers ──────────────────────────────────────────────────
  const updateTransfer = useCallback((transferId, patch) => {
    setTransfers(prev => {
      const next = new Map(prev);
      const current = next.get(transferId) || {};
      next.set(transferId, { ...current, ...patch });
      return next;
    });
  }, []);

  // ── Chunk sender loop ─────────────────────────────────────────
  const sendNextChunks = useCallback(async (transferId) => {
    const ss  = senderState.current.get(transferId);
    const socket = getSocket();
    if (!ss || !socket || !ss.active) return;

    while (ss.inFlight < MAX_IN_FLIGHT && ss.nextChunkToSend < ss.totalChunks && ss.active) {
      const idx = ss.nextChunkToSend;
      ss.nextChunkToSend++;
      ss.inFlight++;

      const chunkData = await readChunk(ss.file, idx);
      socket.emit('CHUNK', { transferId, chunkIndex: idx, totalChunks: ss.totalChunks, chunkData });
    }
  }, []);

  // ── Socket Events ─────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    if (!socket) return;

    // ── Incoming transfer request ───────────────────────────────
    const onTransferRequest = (data) => {
      setPendingRequests(prev => [...prev, data]);
      updateTransfer(data.transferId, {
        transferId:  data.transferId,
        direction:   'receiving',
        status:      'PENDING',
        fileName:    data.fileName,
        fileSize:    data.fileSize,
        totalChunks: data.totalChunks,
        fileHash:    data.fileHash,
        senderId:    data.senderId,
        senderUsername: data.senderUsername,
        progress:    0,
        bytesReceived: 0,
      });
    };

    // ── Sender: receiver accepted, start sending ────────────────
    const onTransferStart = async ({ transferId, lastConfirmedChunk }) => {
      const ss = senderState.current.get(transferId);
      if (!ss) return;
      ss.active = true;
      ss.nextChunkToSend = lastConfirmedChunk + 1;
      updateTransfer(transferId, { status: 'TRANSFERRING' });
      sendNextChunks(transferId);
    };

    // ── Sender: chunk acknowledged by receiver ──────────────────
    const onChunkAck = ({ transferId, chunkIndex, progressPercent, bytesTransferred, speedBytesPerSecond, etaSeconds }) => {
      const ss = senderState.current.get(transferId);
      if (!ss) return;
      ss.inFlight = Math.max(0, ss.inFlight - 1);
      updateTransfer(transferId, { progress: progressPercent, bytesTransferred, speedBytesPerSecond, etaSeconds });
      sendNextChunks(transferId);
    };

    // ── Receiver: got a chunk ───────────────────────────────────
    const onChunk = ({ transferId, chunkIndex, totalChunks, chunkData }) => {
      const socket = getSocket();
      let rs = receiverState.current.get(transferId);
      if (!rs) {
        rs = { chunks: new Array(totalChunks), received: 0 };
        receiverState.current.set(transferId, rs);
      }
      rs.chunks[chunkIndex] = chunkData;
      rs.received++;
      const progress = Math.floor((rs.received / totalChunks) * 100);
      const bytesReceived = rs.received * CHUNK_SIZE;
      updateTransfer(transferId, { progress, bytesReceived });
      // Send application-level ACK
      socket.emit('CHUNK_ACK', { transferId, chunkIndex });
    };

    // ── Transfer complete (sender side) ─────────────────────────
    const onTransferComplete = ({ transferId }) => {
      updateTransfer(transferId, { status: 'COMPLETED', progress: 100 });
      senderState.current.delete(transferId);
    };

    // ── Hash verification (receiver side) ──────────────────────
    const onHashVerify = async ({ transferId, expectedHash }) => {
      const socket = getSocket();
      const rs = receiverState.current.get(transferId);
      if (!rs) return;

      // Reassemble all chunks into a Blob
      const blobs = rs.chunks.map(buf => new Blob([buf]));
      const blob  = new Blob(blobs);

      // Compute SHA-256
      const hashBuffer = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
      const receiverHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      const verified = receiverHash === expectedHash;
      socket.emit('HASH_RESULT', { transferId, receiverHash, senderHash: expectedHash, verified });

      if (verified) {
        // Trigger browser download
        const tf = transfers.get(transferId);
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href = url;
        a.download = tf?.fileName || 'download';
        a.click();
        URL.revokeObjectURL(url);
        updateTransfer(transferId, { status: 'COMPLETED', progress: 100, verified: true });
      } else {
        updateTransfer(transferId, { status: 'FAILED', verified: false, error: 'Hash mismatch — file corrupted' });
      }
      receiverState.current.delete(transferId);
    };

    // ── Pause / Resume ──────────────────────────────────────────
    const onPauseAck = ({ transferId }) => {
      const ss = senderState.current.get(transferId);
      if (ss) ss.active = false;
      updateTransfer(transferId, { status: 'PAUSED' });
    };
    const onResumeAck = ({ transferId, resumeFromChunk }) => {
      const ss = senderState.current.get(transferId);
      if (ss) { ss.active = true; ss.nextChunkToSend = resumeFromChunk; }
      updateTransfer(transferId, { status: 'TRANSFERRING' });
      sendNextChunks(transferId);
    };

    // ── Cancel ──────────────────────────────────────────────────
    const onCancelAck = ({ transferId }) => {
      const ss = senderState.current.get(transferId);
      if (ss) ss.active = false;
      updateTransfer(transferId, { status: 'CANCELLED' });
      senderState.current.delete(transferId);
      receiverState.current.delete(transferId);
    };

    // ── Rejection ───────────────────────────────────────────────
    const onTransferReject = ({ transferId }) => {
      updateTransfer(transferId, { status: 'REJECTED' });
      senderState.current.delete(transferId);
    };

    socket.on('TRANSFER_REQUEST',    onTransferRequest);
    socket.on('TRANSFER_START',      onTransferStart);
    socket.on('CHUNK_ACK',           onChunkAck);
    socket.on('CHUNK',               onChunk);
    socket.on('TRANSFER_COMPLETE',   onTransferComplete);
    socket.on('HASH_VERIFY',         onHashVerify);
    socket.on('PAUSE_ACK',           onPauseAck);
    socket.on('RESUME_ACK',          onResumeAck);
    socket.on('TRANSFER_CANCEL_ACK', onCancelAck);
    socket.on('TRANSFER_REJECT',     onTransferReject);

    return () => {
      socket.off('TRANSFER_REQUEST',    onTransferRequest);
      socket.off('TRANSFER_START',      onTransferStart);
      socket.off('CHUNK_ACK',           onChunkAck);
      socket.off('CHUNK',               onChunk);
      socket.off('TRANSFER_COMPLETE',   onTransferComplete);
      socket.off('HASH_VERIFY',         onHashVerify);
      socket.off('PAUSE_ACK',           onPauseAck);
      socket.off('RESUME_ACK',          onResumeAck);
      socket.off('TRANSFER_CANCEL_ACK', onCancelAck);
      socket.off('TRANSFER_REJECT',     onTransferReject);
    };
  }, [isAuthenticated, sendNextChunks, updateTransfer]);

  // ── Public Actions ────────────────────────────────────────────
  const sendFile = useCallback(async (file, receiverIds, receiverUsernames) => {
    const socket = getSocket();
    if (!socket) throw new Error('Not connected');

    const totalChunks = computeTotalChunks(file);
    // Compute hash in background (non-blocking for small files)
    const fileHash = await computeFileHash(file);

    return new Promise((resolve, reject) => {
      socket.emit('TRANSFER_REQUEST', {
        fileName:    file.name,
        fileSize:    file.size,
        fileHash,
        totalChunks,
        receiverIds,
      }, (res) => {
        if (!res.success) return reject(new Error(res.message));

        // Register sender state for each transfer created
        for (const t of res.data.transfers) {
          senderState.current.set(t.id, {
            file,
            totalChunks,
            nextChunkToSend: 0,
            inFlight: 0,
            active: false,
          });
          updateTransfer(t.id, {
            transferId:  t.id,
            direction:   'sending',
            status:      'PENDING',
            fileName:    file.name,
            fileSize:    file.size,
            totalChunks,
            fileHash,
            receiverId:  t.receiver_id,
            receiverUsername: receiverUsernames?.[t.receiver_id] || t.receiver_id,
            progress:    0,
            bytesTransferred: 0,
          });
        }
        resolve(res.data);
      });
    });
  }, [updateTransfer]);

  const acceptTransfer = useCallback((transferId) => {
    const socket = getSocket();
    return new Promise((resolve, reject) => {
      socket.emit('TRANSFER_ACCEPT', { transferId }, (res) => {
        if (res.success) {
          setPendingRequests(prev => prev.filter(r => r.transferId !== transferId));
          updateTransfer(transferId, { status: 'ACCEPTED' });
          resolve();
        } else reject(new Error(res.message));
      });
    });
  }, [updateTransfer]);

  const rejectTransfer = useCallback((transferId) => {
    const socket = getSocket();
    return new Promise((resolve, reject) => {
      socket.emit('TRANSFER_REJECT', { transferId }, (res) => {
        setPendingRequests(prev => prev.filter(r => r.transferId !== transferId));
        updateTransfer(transferId, { status: 'REJECTED' });
        resolve();
      });
    });
  }, [updateTransfer]);

  const cancelTransfer = useCallback((transferId) => {
    const socket = getSocket();
    const ss = senderState.current.get(transferId);
    if (ss) ss.active = false;
    return new Promise((resolve) => {
      socket.emit('TRANSFER_CANCEL', { transferId }, () => {
        updateTransfer(transferId, { status: 'CANCELLED' });
        senderState.current.delete(transferId);
        resolve();
      });
    });
  }, [updateTransfer]);

  const pauseTransfer = useCallback((transferId) => {
    const socket = getSocket();
    const ss = senderState.current.get(transferId);
    if (ss) ss.active = false;
    socket.emit('PAUSE_TRANSFER', { transferId });
  }, []);

  const resumeTransfer = useCallback((transferId) => {
    const socket = getSocket();
    socket.emit('RESUME_TRANSFER', { transferId }, (res) => {
      if (res.success) {
        const ss = senderState.current.get(transferId);
        if (ss) { ss.active = true; ss.nextChunkToSend = res.data.resumeFromChunk; }
        updateTransfer(transferId, { status: 'TRANSFERRING' });
        sendNextChunks(transferId);
      }
    });
  }, [updateTransfer, sendNextChunks]);

  return (
    <TransferContext.Provider value={{
      transfers,
      pendingRequests,
      sendFile,
      acceptTransfer,
      rejectTransfer,
      cancelTransfer,
      pauseTransfer,
      resumeTransfer,
    }}>
      {children}
    </TransferContext.Provider>
  );
}

export function useTransfer() {
  const ctx = useContext(TransferContext);
  if (!ctx) throw new Error('useTransfer must be used inside TransferProvider');
  return ctx;
}
