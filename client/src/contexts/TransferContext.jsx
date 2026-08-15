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
import { computeFileHash, computeBufferHash, computeTotalChunks, readChunk, formatBytes } from '../utils/fileUtils';

// Max chunks in-flight (application-level backpressure)

const MAX_IN_FLIGHT = 4;
const CHUNK_SIZE = 1024 * 1024; // 1 MB

const TransferContext = createContext(null);

export function TransferProvider({ children }) {
  const { user, token, isAuthenticated } = useAuth();


  // Map<transferId, transferObj>
  const [transfers, setTransfers]           = useState(new Map());
  // Incoming requests waiting for accept/reject
  const [pendingRequests, setPendingRequests] = useState([]);
  // Map<transferId, { file, inFlight, nextChunkToSend, active }>
  const senderState = useRef(new Map());
  // Map<transferId, { chunks: [], received: 0, fileName, fileType }> for receiver reassembly
  const receiverState = useRef(new Map());
  // Map<transferId, { fileName, fileSize, fileType }> metadata cache
  const receiverMetadata = useRef(new Map());

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
    if (!isAuthenticated || !token) return;

    let activeSocket = null;
    let timer = null;

    // ── Incoming transfer request ───────────────────────────────
    const onTransferRequest = (data) => {
      console.log('[TransferContext] Incoming TRANSFER_REQUEST:', data);
      receiverMetadata.current.set(data.transferId, {
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
      });

      setPendingRequests(prev => {
        if (prev.some(r => r.transferId === data.transferId)) return prev;
        return [...prev, data];
      });
      updateTransfer(data.transferId, {
        transferId:  data.transferId,
        direction:   'receiving',
        status:      'PENDING',
        fileName:    data.fileName,
        fileSize:    data.fileSize,
        fileType:    data.fileType,
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
      console.log('[TransferContext] TRANSFER_START received:', transferId);
      const ss = senderState.current.get(transferId);
      if (!ss) return;
      ss.active = true;
      ss.nextChunkToSend = (lastConfirmedChunk ?? -1) + 1;
      updateTransfer(transferId, { status: 'TRANSFERRING' });
      sendNextChunks(transferId);
    };

    // ── Sender: chunk acknowledged by receiver ──────────────────
    const onChunkAck = ({ transferId, chunkIndex, progressPercent, bytesTransferred, speedBytesPerSecond, etaSeconds }) => {
      const ss = senderState.current.get(transferId);
      if (!ss) return;
      ss.inFlight = Math.max(0, ss.inFlight - 1);
      updateTransfer(transferId, {
        status: 'TRANSFERRING',
        progress: progressPercent,
        bytesTransferred,
        speedBytesPerSecond,
        etaSeconds,
      });
      sendNextChunks(transferId);
    };

    // ── Receiver: got a chunk ───────────────────────────────────
    const onChunk = ({ transferId, chunkIndex, totalChunks, chunkData }) => {
      const socket = getSocket();
      let rs = receiverState.current.get(transferId);
      if (!rs) {
        const meta = receiverMetadata.current.get(transferId);
        rs = {
          chunks: new Array(totalChunks),
          received: 0,
          fileName: meta?.fileName || 'download',
          fileType: meta?.fileType || 'application/octet-stream',
        };
        receiverState.current.set(transferId, rs);
      }
      rs.chunks[chunkIndex] = chunkData;
      rs.received++;
      const progress = Math.floor((rs.received / totalChunks) * 100);
      const bytesReceived = rs.received * CHUNK_SIZE;
      updateTransfer(transferId, { status: 'TRANSFERRING', progress, bytesReceived });
      // Send application-level ACK
      if (socket) {
        socket.emit('CHUNK_ACK', { transferId, chunkIndex });
      }
    };

    // ── Transfer complete (sender side) ─────────────────────────
    const onTransferComplete = ({ transferId }) => {
      console.log('[TransferContext] TRANSFER_COMPLETE:', transferId);
      updateTransfer(transferId, { status: 'COMPLETED', progress: 100 });
      senderState.current.delete(transferId);
    };

    // ── Hash verification (receiver side) ──────────────────────
    const onHashVerify = async ({ transferId, expectedHash }) => {
      console.log('[TransferContext] HASH_VERIFY:', transferId);
      const socket = getSocket();
      const rs = receiverState.current.get(transferId);
      if (!rs) return;

      const meta = receiverMetadata.current.get(transferId);
      const finalFileName = rs.fileName || meta?.fileName || 'download';
      const finalFileType = rs.fileType || meta?.fileType || 'application/octet-stream';

      // Reassemble all chunks into the original binary Blob
      const blob = new Blob(rs.chunks, { type: finalFileType });

      // Compute SHA-256 integrity checksum over the reconstructed bytes
      let receiverHash = '';
      try {
        const arrayBuf = await blob.arrayBuffer();
        receiverHash = await computeBufferHash(arrayBuf);
      } catch (err) {
        console.warn('[TransferContext] hash computation error:', err);
      }

      const verified = !expectedHash || !receiverHash || receiverHash === expectedHash;
      if (socket) {
        socket.emit('HASH_RESULT', { transferId, receiverHash, senderHash: expectedHash, verified });
      }


      if (verified) {
        // Trigger browser download preserving original file name and format
        const url = URL.createObjectURL(blob);
        updateTransfer(transferId, {
          status: 'COMPLETED',
          progress: 100,
          verified: true,
          blobUrl: url,
          fileName: finalFileName,
        });

        try {
          const a = document.createElement('a');
          a.href = url;
          a.download = finalFileName;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            if (document.body.contains(a)) {
              document.body.removeChild(a);
            }
          }, 1000);
        } catch (err) {
          console.warn('[TransferContext] Automatic download trigger suppressed by browser:', err);
        }
      } else {
        updateTransfer(transferId, { status: 'FAILED', verified: false, error: 'Hash mismatch — file corrupted' });
      }
      receiverState.current.delete(transferId);
      receiverMetadata.current.delete(transferId);
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

    const attach = () => {
      const s = getSocket();
      if (s) {
        activeSocket = s;
        s.off('TRANSFER_REQUEST',    onTransferRequest);
        s.off('TRANSFER_START',      onTransferStart);
        s.off('CHUNK_ACK',           onChunkAck);
        s.off('CHUNK',               onChunk);
        s.off('TRANSFER_COMPLETE',   onTransferComplete);
        s.off('HASH_VERIFY',         onHashVerify);
        s.off('PAUSE_ACK',           onPauseAck);
        s.off('RESUME_ACK',          onResumeAck);
        s.off('TRANSFER_CANCEL_ACK', onCancelAck);
        s.off('TRANSFER_REJECT',     onTransferReject);

        s.on('TRANSFER_REQUEST',    onTransferRequest);
        s.on('TRANSFER_START',      onTransferStart);
        s.on('CHUNK_ACK',           onChunkAck);
        s.on('CHUNK',               onChunk);
        s.on('TRANSFER_COMPLETE',   onTransferComplete);
        s.on('HASH_VERIFY',         onHashVerify);
        s.on('PAUSE_ACK',           onPauseAck);
        s.on('RESUME_ACK',          onResumeAck);
        s.on('TRANSFER_CANCEL_ACK', onCancelAck);
        s.on('TRANSFER_REJECT',     onTransferReject);
      } else {
        timer = setTimeout(attach, 250);
      }
    };

    attach();

    return () => {
      if (timer) clearTimeout(timer);
      if (activeSocket) {
        activeSocket.off('TRANSFER_REQUEST',    onTransferRequest);
        activeSocket.off('TRANSFER_START',      onTransferStart);
        activeSocket.off('CHUNK_ACK',           onChunkAck);
        activeSocket.off('CHUNK',               onChunk);
        activeSocket.off('TRANSFER_COMPLETE',   onTransferComplete);
        activeSocket.off('HASH_VERIFY',         onHashVerify);
        activeSocket.off('PAUSE_ACK',           onPauseAck);
        activeSocket.off('RESUME_ACK',          onResumeAck);
        activeSocket.off('TRANSFER_CANCEL_ACK', onCancelAck);
        activeSocket.off('TRANSFER_REJECT',     onTransferReject);
      }
    };
  }, [isAuthenticated, token, sendNextChunks, updateTransfer]);

  // ── Public Actions ────────────────────────────────────────────
  const sendFile = useCallback(async (file, receiverIds, receiverUsernames) => {
    const socket = getSocket();
    if (!socket) throw new Error('Not connected to server');

    const totalChunks = computeTotalChunks(file);
    // Compute hash in background (non-blocking for small files)
    const fileHash = await computeFileHash(file);

    return new Promise((resolve, reject) => {
      socket.emit('TRANSFER_REQUEST', {
        fileName:    file.name,
        fileSize:    file.size,
        fileType:    file.type,
        fileHash,
        totalChunks,
        receiverIds,
      }, (res) => {

        if (!res || !res.success) return reject(new Error(res?.message || 'Transfer request failed'));

        // Register sender state for each transfer created
        for (const t of res.data.transfers) {
          const recId = t.receiverId || t.receiver_id;
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
            receiverId:  recId,
            receiverUsername: receiverUsernames?.[recId] || recId,
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
      if (!socket) return reject(new Error('Not connected'));
      socket.emit('TRANSFER_ACCEPT', { transferId }, (res) => {
        if (res?.success) {
          setPendingRequests(prev => prev.filter(r => r.transferId !== transferId));
          updateTransfer(transferId, { status: 'ACCEPTED' });
          resolve();
        } else {
          reject(new Error(res?.message || 'Failed to accept transfer'));
        }
      });
    });
  }, [updateTransfer]);

  const rejectTransfer = useCallback((transferId) => {
    const socket = getSocket();
    return new Promise((resolve) => {
      if (socket) {
        socket.emit('TRANSFER_REJECT', { transferId }, () => {
          setPendingRequests(prev => prev.filter(r => r.transferId !== transferId));
          updateTransfer(transferId, { status: 'REJECTED' });
          resolve();
        });
      } else {
        setPendingRequests(prev => prev.filter(r => r.transferId !== transferId));
        updateTransfer(transferId, { status: 'REJECTED' });
        resolve();
      }
    });
  }, [updateTransfer]);

  const cancelTransfer = useCallback((transferId) => {
    const socket = getSocket();
    const ss = senderState.current.get(transferId);
    if (ss) ss.active = false;
    return new Promise((resolve) => {
      if (socket) {
        socket.emit('TRANSFER_CANCEL', { transferId }, () => {
          updateTransfer(transferId, { status: 'CANCELLED' });
          senderState.current.delete(transferId);
          resolve();
        });
      } else {
        updateTransfer(transferId, { status: 'CANCELLED' });
        senderState.current.delete(transferId);
        resolve();
      }
    });
  }, [updateTransfer]);

  const pauseTransfer = useCallback((transferId) => {
    const socket = getSocket();
    const ss = senderState.current.get(transferId);
    if (ss) ss.active = false;
    if (socket) {
      socket.emit('PAUSE_TRANSFER', { transferId });
    }
  }, []);

  const resumeTransfer = useCallback((transferId) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('RESUME_TRANSFER', { transferId }, (res) => {
      if (res?.success) {
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

