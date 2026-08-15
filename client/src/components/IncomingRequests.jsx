/**
 * DropShare — Incoming Request Modal
 * Shows when another user wants to send you a file.
 */
import { useTransfer } from '../contexts/TransferContext';
import { formatBytes } from '../utils/fileUtils';

export default function IncomingRequests() {
  const { pendingRequests, acceptTransfer, rejectTransfer } = useTransfer();

  if (pendingRequests.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-sm space-y-3">
        {pendingRequests.map(req => (
          <div key={req.transferId}
            className="card-glass p-5 animate-slide-up shadow-2xl shadow-black/40">
            <div className="flex items-center gap-3 mb-4">
              {/* User avatar */}
              <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center font-semibold flex-shrink-0">
                {(req.senderUsername || 'U')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100">{req.senderUsername} wants to send you a file</p>
              </div>
            </div>

            {/* File details */}
            <div className="bg-surface-700 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
              <svg className="w-6 h-6 text-brand-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">{req.fileName}</p>
                <p className="text-xs text-slate-500">{formatBytes(req.fileSize)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                id={`reject-${req.transferId}`}
                onClick={() => rejectTransfer(req.transferId)}
                className="btn-danger flex-1">
                Decline
              </button>
              <button
                id={`accept-${req.transferId}`}
                onClick={() => acceptTransfer(req.transferId)}
                className="btn-primary flex-1">
                Accept
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
