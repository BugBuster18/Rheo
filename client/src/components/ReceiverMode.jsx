/**
 * RHEO — Receiver Mode Component
 * Dedicated discoverable radar mode for receiving files in real-time.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTransfer } from '../contexts/TransferContext';
import { usePresence } from '../contexts/PresenceContext';
import TransferCard from './TransferCard';
import Avatar from './Avatar';
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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Discoverability Radar Banner ─────────────────────────────────── */}
      <div className="card-clean p-6 sm:p-8 bg-gradient-to-r from-teal-50/70 via-white to-cyan-50/60 border border-teal-200/80 shadow-md shadow-teal-900/5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-center gap-5 sm:gap-6">
            {/* Animated Radar Pulse Node */}
            <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
              <div className="radar-pulse-ring" />
              <div className="radar-pulse-ring radar-pulse-ring-2" />
              <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-600/30">
                <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge-online" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700 font-mono">
                  Device Discoverable on Mesh
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Ready to Receive Flows
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Your device <span className="font-bold text-teal-800 font-mono">@{user?.username}</span> is broadcasting to active senders. Keep this window open.
              </p>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-4 bg-white/90 p-3.5 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto justify-between md:justify-start">
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800">Auto-Accept Flows</p>
              <p className="text-[11px] text-slate-400">Stream files without manual approval</p>
            </div>
            <button
              onClick={() => setAutoAccept(!autoAccept)}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                autoAccept ? 'bg-teal-600' : 'bg-slate-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                autoAccept ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Pending Requests Panel ───────────────────────────────────────── */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              Incoming Flow Requests ({pendingRequests.length})
            </h3>
            <span className="text-xs text-amber-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Action Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map(req => (
              <div key={req.transferId} className="card-clean p-5 space-y-4 border-amber-200 bg-amber-50/20">
                <div className="flex items-center gap-3">
                  <Avatar name={req.senderUsername} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">@{req.senderUsername}</p>
                    <p className="text-xs text-slate-500">requests to stream a file</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-xl bg-white text-slate-800 border border-slate-200 font-mono font-bold shadow-sm">
                    {formatBytes(req.fileSize)}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-2xl flex items-center gap-3 border border-slate-200">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{req.fileName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{req.totalChunks} chunks</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => rejectTransfer(req.transferId)}
                    className="btn-danger flex-1 py-2 text-xs font-bold rounded-xl">
                    Decline
                  </button>
                  <button
                    onClick={() => acceptTransfer(req.transferId)}
                    className="btn-teal flex-1 py-2 text-xs font-bold rounded-xl shadow-md shadow-teal-600/15">
                    Accept & Receive
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Active & Completed Receives ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Active Streams */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900">Active Incoming Streams</h3>
            {activeReceives.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold">
                {activeReceives.length} active
              </span>
            )}
          </div>

          {activeReceives.length === 0 ? (
            <div className="card-clean p-8 text-center text-slate-400 space-y-2 border-dashed">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <p className="text-sm font-bold text-slate-700">No incoming streams right now</p>
              <p className="text-xs text-slate-400">When someone sends you a file, live progress will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeReceives.map(t => <TransferCard key={t.transferId} transfer={t} />)}
            </div>
          )}
        </div>

        {/* Received Files History */}
        <div className="space-y-4">
          <h3 className="text-base font-extrabold text-slate-900">Received File Downloads</h3>

          {completedReceives.length === 0 ? (
            <div className="card-clean p-8 text-center text-slate-400 space-y-2 border-dashed">
              <p className="text-sm font-bold text-slate-700">No received files yet</p>
              <p className="text-xs text-slate-400">Files received in this session will be available here for direct download.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {completedReceives.map(t => <TransferCard key={t.transferId} transfer={t} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
