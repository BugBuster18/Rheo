/**
 * DropShare — Incoming Request Permission Modal
 * Prompts receiver for permission to accept or decline incoming file transfers.
 */
import { useTransfer } from '../contexts/TransferContext';
import { formatBytes } from '../utils/fileUtils';

export default function IncomingRequests() {
  const { pendingRequests, acceptTransfer, rejectTransfer } = useTransfer();

  if (pendingRequests.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md space-y-4">
        {pendingRequests.map(req => (
          <div
            key={req.transferId}
            className="card-glass p-6 animate-slide-up shadow-2xl border-2 border-brand-500/40 relative overflow-hidden card-glow-brand"
          >
            {/* Top alert bar */}
            <div className="flex items-center justify-between pb-3 border-b border-surface-600/50 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Incoming Connection Request</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-500/20 text-brand-300">
                P2P Request
              </span>
            </div>

            {/* Sender user info */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center font-extrabold text-white text-lg shadow-lg shadow-brand-600/40 flex-shrink-0">
                {(req.senderUsername || 'U')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-white truncate">@{req.senderUsername || 'Sender'}</h4>
                <p className="text-xs text-slate-400">wants to stream a file directly to your device</p>
              </div>
            </div>

            {/* File info card */}
            <div className="bg-surface-800/90 rounded-2xl p-4 mb-6 flex items-center gap-4 border border-surface-600/60 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center text-brand-400 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-100 truncate">{req.fileName}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span className="font-mono text-emerald-400">{formatBytes(req.fileSize)}</span>
                  <span>•</span>
                  <span>{req.totalChunks} chunks</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                id={`reject-${req.transferId}`}
                onClick={() => rejectTransfer(req.transferId)}
                className="btn-danger flex-1 py-3 text-sm font-semibold rounded-xl"
              >
                Decline
              </button>
              <button
                id={`accept-${req.transferId}`}
                onClick={() => acceptTransfer(req.transferId)}
                className="btn-emerald flex-1 py-3 text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Accept & Stream
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
