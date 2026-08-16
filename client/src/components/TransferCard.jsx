/**
 * RHEO — Transfer Card Component
 * Shows file info, animated live stats panel, download action.
 */
import { useTransfer } from '../contexts/TransferContext';
import { formatBytes } from '../utils/fileUtils';
import TransferStats from './TransferStats';

const STATUS_BADGES = {
  PENDING:      'text-amber-700 bg-amber-50 border-amber-200',
  ACCEPTED:     'text-cyan-700 bg-cyan-50 border-cyan-200',
  TRANSFERRING: 'text-teal-700 bg-teal-50 border-teal-200',
  PAUSED:       'text-amber-700 bg-amber-50 border-amber-200',
  COMPLETED:    'text-emerald-700 bg-emerald-50 border-emerald-200',
  CANCELLED:    'text-slate-600 bg-slate-100 border-slate-200',
  FAILED:       'text-red-700 bg-red-50 border-red-200',
  REJECTED:     'text-red-700 bg-red-50 border-red-200',
  INTERRUPTED:  'text-orange-700 bg-orange-50 border-orange-200',
};

const STATUS_LABELS = {
  PENDING:      'Pending',
  ACCEPTED:     'Accepted',
  TRANSFERRING: 'Streaming',
  PAUSED:       'Paused',
  COMPLETED:    'Complete',
  CANCELLED:    'Cancelled',
  FAILED:       'Failed',
  REJECTED:     'Rejected',
  INTERRUPTED:  'Interrupted',
};

export default function TransferCard({ transfer }) {
  const { cancelTransfer, pauseTransfer, resumeTransfer } = useTransfer();
  const {
    transferId, direction, status, fileName, fileSize,
    progress = 0, senderUsername, receiverUsername,
    error, verified, blobUrl,
  } = transfer;

  const isActive  = status === 'TRANSFERRING' || status === 'PAUSED';
  const isSending = direction === 'sending';
  const peer      = isSending ? receiverUsername : senderUsername;

  return (
    <div className="card-clean p-4 space-y-3 animate-slide-up hover:border-slate-300 transition-all">
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* File type icon */}
        <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-slate-900 truncate" title={fileName}>{fileName}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 font-mono">
            <span>{formatBytes(fileSize)}</span>
            <span>·</span>
            <span className={`font-bold ${isSending ? 'text-teal-700' : 'text-emerald-700'}`}>
              {isSending ? `→ @${peer}` : `← @${peer}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status badge */}
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${STATUS_BADGES[status] || STATUS_BADGES.PENDING}`}>
            {STATUS_LABELS[status] || status}
          </span>

          {/* Streaming indicator dot */}
          {status === 'TRANSFERRING' && (
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Simple progress bar for non-active states */}
      {status === 'COMPLETED' && (
        <div>
          <div className="progress-track h-1.5">
            <div className="progress-fill h-full w-full" />
          </div>
        </div>
      )}

      {/* Live animated stats (only while transferring/accepted) */}
      {(status === 'TRANSFERRING' || status === 'ACCEPTED') && (
        <TransferStats transfer={transfer} />
      )}

      {/* Error */}
      {error && (
        <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100">
          ⚠️ {error}
        </p>
      )}

      {/* Hash verified */}
      {status === 'COMPLETED' && verified !== undefined && (
        <div className={`text-xs font-bold flex items-center gap-1.5 ${verified ? 'text-emerald-700' : 'text-red-600'}`}>
          {verified
            ? <><span>✓</span> SHA-256 verified — bit-for-bit intact</>
            : <><span>✗</span> Hash mismatch</>}
        </div>
      )}

      {/* Download button */}
      {!isSending && status === 'COMPLETED' && blobUrl && (
        <a
          href={blobUrl}
          download={fileName || 'download'}
          className="btn-teal w-full py-2.5 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Save {fileName}
        </a>
      )}

      {/* Pause/Resume/Cancel */}
      {isActive && isSending && (
        <div className="flex gap-2">
          {status === 'TRANSFERRING' ? (
            <button
              id={`pause-${transferId}`}
              onClick={() => pauseTransfer(transferId)}
              className="btn-ghost text-xs py-1.5 px-3 rounded-xl font-bold flex-1"
            >
              ⏸ Pause
            </button>
          ) : (
            <button
              id={`resume-${transferId}`}
              onClick={() => resumeTransfer(transferId)}
              className="btn-success text-xs py-1.5 px-3 rounded-xl font-bold flex-1"
            >
              ▶ Resume
            </button>
          )}
          <button
            id={`cancel-${transferId}`}
            onClick={() => cancelTransfer(transferId)}
            className="btn-danger text-xs py-1.5 px-3 rounded-xl font-bold"
          >
            ✕ Cancel
          </button>
        </div>
      )}
    </div>
  );
}
