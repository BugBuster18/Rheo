/**
 * DropShare — Dashboard Page
 * Multi-mode structured UI: Sender Mode, Receiver Mode, and All Activity.
 */
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTransfer } from '../contexts/TransferContext';
import SenderMode from '../components/SenderMode';
import ReceiverMode from '../components/ReceiverMode';
import TransferCard from '../components/TransferCard';
import IncomingRequests from '../components/IncomingRequests';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { transfers } = useTransfer();

  // Mode: 'sender' | 'receiver' | 'all'
  const [activeMode, setActiveMode] = useState('sender');

  const transferList = Array.from(transfers.values());
  const activeTransfers = transferList.filter(t => ['PENDING','ACCEPTED','TRANSFERRING','PAUSED'].includes(t.status));
  const completedTransfers = transferList.filter(t => ['COMPLETED','CANCELLED','FAILED','REJECTED','INTERRUPTED'].includes(t.status));

  const totalSending = transferList.filter(t => t.direction === 'sending').length;
  const totalReceiving = transferList.filter(t => t.direction === 'receiving').length;

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* ── Top Header Navigation ─────────────────────────────────────────── */}
      <header className="border-b border-surface-700/60 bg-surface-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-brand-600/30">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <span className="font-extrabold text-lg gradient-text tracking-tight">Rheo</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20">
                P2P Mesh v1.0
              </span>
            </div>
          </div>

          {/* Mode Switcher Pill */}
          <div className="mode-pill flex items-center">
            <button
              id="mode-sender-btn"
              onClick={() => setActiveMode('sender')}
              className={`mode-pill-button flex items-center gap-1.5 ${
                activeMode === 'sender' ? 'active-sender' : ''
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>Sender Mode</span>
            </button>

            <button
              id="mode-receiver-btn"
              onClick={() => setActiveMode('receiver')}
              className={`mode-pill-button flex items-center gap-1.5 ${
                activeMode === 'receiver' ? 'active-receiver' : ''
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Receiver Mode</span>
            </button>

            <button
              id="mode-all-btn"
              onClick={() => setActiveMode('all')}
              className={`mode-pill-button hidden md:flex items-center gap-1.5 ${
                activeMode === 'all' ? 'active-transfers' : ''
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>All Activity</span>
            </button>
          </div>

          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm bg-surface-800 px-3 py-1.5 rounded-full border border-surface-600/50">
              <span className="badge-online" />
              <span className="font-semibold text-slate-200 text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[140px]">
                {user?.display_name || user?.username}
              </span>
            </div>
            <button id="logout-btn" onClick={logout} className="btn-ghost text-xs py-1.5 px-3 rounded-full">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Dashboard Body ───────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        
        {/* Quick Stats Counter Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold">
              ⚡
            </div>
            <div>
              <p className="text-xs text-slate-400">Active Streams</p>
              <p className="text-xl font-extrabold text-white">{activeTransfers.length}</p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
              📤
            </div>
            <div>
              <p className="text-xs text-slate-400">Files Sent</p>
              <p className="text-xl font-extrabold text-white">{totalSending}</p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              📥
            </div>
            <div>
              <p className="text-xs text-slate-400">Files Received</p>
              <p className="text-xl font-extrabold text-white">{totalReceiving}</p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              🔒
            </div>
            <div>
              <p className="text-xs text-slate-400">Mesh Security</p>
              <p className="text-sm font-extrabold text-emerald-400 flex items-center gap-1">
                <span>SHA-256</span>
                <span className="text-[10px] font-normal text-slate-400">(AES Chunked)</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Mode Render Views ───────────────────────────────────────────── */}
        {activeMode === 'sender' && <SenderMode />}
        {activeMode === 'receiver' && <ReceiverMode />}

        {activeMode === 'all' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span>Active Transfers</span>
                {activeTransfers.length > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300">
                    {activeTransfers.length} running
                  </span>
                )}
              </h2>

              {activeTransfers.length === 0 ? (
                <div className="card p-12 text-center text-slate-500 space-y-2 border-dashed">
                  <p className="text-sm font-medium text-slate-400">No active transfers running</p>
                  <p className="text-xs text-slate-600">Switch to Sender Mode or Receiver Mode to start transferring files.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeTransfers.map(t => <TransferCard key={t.transferId} transfer={t} />)}
                </div>
              )}
            </div>

            {completedTransfers.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-slate-100 mb-4">Complete Transfer History</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedTransfers.map(t => <TransferCard key={t.transferId} transfer={t} />)}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Global Incoming Request Modal */}
      <IncomingRequests />
    </div>
  );
}
