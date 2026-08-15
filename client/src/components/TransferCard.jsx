/**
 * DropShare — Transfer Card Component
 * Displays one active or past transfer with progress, speed, ETA, and actions.
 */
import { useTransfer } from '../contexts/TransferContext';
import { formatBytes, formatSpeed, formatEta } from '../utils/fileUtils';

const STATUS_STYLES = {
  PENDING:      'text-amber-400 bg-amber-400/10 border-amber-400/30',
  ACCEPTED:     'text-sky-400 bg-sky-400/10 border-sky-400/30',
  TRANSFERRING: 'text-brand-400 bg-brand-400/10 border-brand-400/30',
  PAUSED:       'text-amber-300 bg-amber-300/10 border-amber-300/30',
  COMPLETED:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  CANCELLED:    'text-slate-400 bg-slate-400/10 border-slate-400/30',
  FAILED:       'text-red-400 bg-red-400/10 border-red-400/30',
  REJECTED:     'text-red-400 bg-red-400/10 border-red-400/30',
  INTERRUPTED:  'text-orange-400 bg-orange-400/10 border-orange-400/30',
};

const FILE_ICON = (
  <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export default function TransferCard({ transfer }) {
  const { cancelTransfer, pauseTransfer, resumeTransfer } = useTransfer();
  const {
    transferId, direction, status, fileName, fileSize,
    progress = 0, bytesTransferred, bytesReceived,
    speedBytesPerSecond, etaSeconds,
    senderUsername, receiverUsername,
    error, verified,
  } = transfer;

  const isActive = status === 'TRANSFERRING' || status === 'PAUSED';
  const isSending = direction === 'sending';
  const bytes = isSending ? bytesTransferred : bytesReceived;
  const peer  = isSending ? receiverUsername : senderUsername;

  return (
    <div className="card p-4 space-y-3 animate-slide-up hover:border-surface-500 transition-colors">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-surface-700 flex items-center justify-center">
          {FILE_ICON}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-slate-100 truncate" title={fileName}>{fileName}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatBytes(fileSize)} · {isSending ? '→' : '←'} {peer}
          </p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${STATUS_STYLES[status] || STATUS_STYLES.PENDING}`}>
          {status}
        </span>
      </div>

      {/* Progress bar */}
      {(isActive || status === 'COMPLETED') && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-500">
              {bytes ? formatBytes(bytes) : '0 B'} / {formatBytes(fileSize)}
            </span>
            <span className="text-xs font-medium text-brand-400">{progress}%</span>
          </div>
          <div className="progress-track h-1.5">
            <div className="progress-fill h-full" style={{ width: `${progress}%` }} />
          </div>
          {status === 'TRANSFERRING' && (
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-600">{speedBytesPerSecond ? formatSpeed(speedBytesPerSecond) : '—'}</span>
              <span className="text-xs text-slate-600">ETA {formatEta(etaSeconds)}</span>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Hash verified badge */}
      {status === 'COMPLETED' && verified !== undefined && (
        <div className={`text-xs flex items-center gap-1.5 ${verified ? 'text-emerald-400' : 'text-red-400'}`}>
          {verified
            ? <><span className="text-emerald-400">✓</span> SHA-256 verified</>
            : <><span className="text-red-400">✗</span> Hash mismatch</>}
        </div>
      )}

      {/* Action buttons */}
      {isActive && isSending && (
        <div className="flex gap-2">
          {status === 'TRANSFERRING' ? (
            <button id={`pause-${transferId}`} onClick={() => pauseTransfer(transferId)} className="btn-ghost text-xs py-1.5 px-3">
              ⏸ Pause
            </button>
          ) : (
            <button id={`resume-${transferId}`} onClick={() => resumeTransfer(transferId)} className="btn-success text-xs py-1.5 px-3">
              ▶ Resume
            </button>
          )}
          <button id={`cancel-${transferId}`} onClick={() => cancelTransfer(transferId)} className="btn-danger text-xs py-1.5 px-3">
            ✕ Cancel
          </button>
        </div>
      )}
    </div>
  );
}
