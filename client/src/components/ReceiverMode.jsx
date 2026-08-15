/**
 * DropShare — Receiver Mode Component
 * Dedicated discoverable radar mode for receiving files.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTransfer } from '../contexts/TransferContext';
import { usePresence } from '../contexts/PresenceContext';
import TransferCard from './TransferCard';
import { formatBytes } from '../utils/fileUtils';

export default function ReceiverMode() {
  const { user } = useAuth();
  const { transfers, pendingRequests, acceptTransfer, rejectTransfer } = useTransfer();
  const { presence } = usePresence();
  const [autoAccept, setAutoAccept] = useState(false);

  const transferList = Array.from(transfers.values());
  const incomingTransfers = transferList.filter(t => t.direction === 'receiving');
  const activeReceives = incomingTransfers.filter(t => ['PENDING','ACCEPTED','TRANSFERRING','PAUSED'].includes(t.status));
  const completedReceives = incomingTransfers.filter(t => ['COMPLETED','CANCELLED','FAILED','REJECTED','INTERRUPTED'].includes(t.status));

  // Auto-accept transfers if enabled
  useEffect(() => {
    if (autoAccept && pendingRequests.length > 0) {
      pendingRequests.forEach(req => {
        acceptTransfer(req.transferId);
      });
    }
  }, [autoAccept, pendingRequests, acceptTransfer]);

  // Find all online users from presence Map
  const onlineUserCount = Array.from(presence.values()).filter(v => v === 'online' || v === true).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Discoverability Radar Banner ─────────────────────────────────── */}
      <div className="card-glass p-8 relative overflow-hidden card-glow-emerald border border-emerald-500/20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-center gap-6">
            {/* Animated Radar Pulse Node */}
            <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <div className="radar-ring" />
              <div className="radar-ring radar-ring-2" />
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge-online" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Device Discoverable</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                  Public Receiver Mode
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-white">
                Ready to Receive Files
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Your device <span className="text-slate-200 font-semibold">@{user?.username}</span> is visible to all senders. Keep this tab open to stream incoming files.
              </p>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-4 bg-surface-800/80 p-3 rounded-xl border border-surface-600/50 w-full md:w-auto justify-between md:justify-start">
            <div className="text-left">
              <p className="text-xs font-medium text-slate-400">Auto-Accept Transfers</p>
              <p className="text-[11px] text-slate-500">Automatically accept incoming requests</p>
            </div>
            <button
              onClick={() => setAutoAccept(!autoAccept)}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                autoAccept ? 'bg-emerald-500' : 'bg-surface-600'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                autoAccept ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ── Pending Requests Panel ───────────────────────────────────────── */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              Incoming File Requests ({pendingRequests.length})
            </h3>
            <span className="text-xs text-amber-400 font-medium">Action Required</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map(req => (
              <div key={req.transferId} className="card-glass p-5 space-y-4 border-amber-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center">
                    {(req.senderUsername || 'U')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100">@{req.senderUsername}</p>
                    <p className="text-xs text-slate-400">wants to send you a file</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                    {formatBytes(req.fileSize)}
                  </span>
                </div>

                <div className="bg-surface-800/80 p-3 rounded-xl flex items-center gap-3 border border-surface-600/40">
                  <svg className="w-6 h-6 text-brand-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{req.fileName}</p>
                    <p className="text-xs text-slate-500">{req.totalChunks} chunks</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => rejectTransfer(req.transferId)}
                    className="btn-danger flex-1 py-2 text-xs">
                    Decline
                  </button>
                  <button
                    onClick={() => acceptTransfer(req.transferId)}
                    className="btn-emerald flex-1 py-2 text-xs">
                    Accept & Receive
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Active & Completed Receives ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Streams */}
        <div>
          <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center justify-between">
            <span>Active Incoming Transfers</span>
            {activeReceives.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300">
                {activeReceives.length} active
              </span>
            )}
          </h3>

          {activeReceives.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 space-y-2 border-dashed">
              <svg className="w-10 h-10 mx-auto text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <p className="text-sm font-medium text-slate-400">No active files being received</p>
              <p className="text-xs text-slate-600">When someone sends you a file, incoming progress will stream live here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeReceives.map(t => <TransferCard key={t.transferId} transfer={t} />)}
            </div>
          )}
        </div>

        {/* Received Files History */}
        <div>
          <h3 className="text-lg font-bold text-slate-100 mb-4">
            Received File History
          </h3>

          {completedReceives.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 space-y-2 border-dashed">
              <p className="text-sm font-medium text-slate-400">No received files yet</p>
              <p className="text-xs text-slate-600">Completed file downloads will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {completedReceives.map(t => <TransferCard key={t.transferId} transfer={t} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
