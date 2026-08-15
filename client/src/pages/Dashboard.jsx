/**
 * DropShare — Dashboard Page
 * Main screen after login: send files, see active/past transfers.
 */
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTransfer } from '../contexts/TransferContext';
import DropZone from '../components/DropZone';
import UserSearch from '../components/UserSearch';
import TransferCard from '../components/TransferCard';
import IncomingRequests from '../components/IncomingRequests';

export default function Dashboard() {
  const { user, logout }    = useAuth();
  const { transfers, sendFile } = useTransfer();

  const [file, setFile]         = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [sending, setSending]   = useState(false);
  const [sendError, setSendError] = useState('');

  const toggleRecipient = (u) => {
    setRecipients(prev =>
      prev.some(r => r.id === u.id) ? prev.filter(r => r.id !== u.id) : [...prev, u]
    );
  };

  const handleSend = async () => {
    if (!file || recipients.length === 0) return;
    setSending(true);
    setSendError('');
    try {
      const usernameMap = {};
      recipients.forEach(r => { usernameMap[r.id] = r.username; });
      await sendFile(file, recipients.map(r => r.id), usernameMap);
      setFile(null);
      setRecipients([]);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const transferList = Array.from(transfers.values());
  const active  = transferList.filter(t => ['PENDING','ACCEPTED','TRANSFERRING','PAUSED'].includes(t.status));
  const history  = transferList.filter(t => ['COMPLETED','CANCELLED','FAILED','REJECTED','INTERRUPTED'].includes(t.status));

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col">
      {/* ── Nav ───────────────────────────────────────────── */}
      <header className="border-b border-surface-700 bg-surface-800/60 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <span className="font-bold gradient-text">DropShare</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="badge-online" />
              <span>{user?.display_name || user?.username}</span>
            </div>
            <button id="logout-btn" onClick={logout} className="btn-ghost text-xs py-1.5 px-3">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Send Panel ─────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Send a File</h2>

            <div className="card p-5 space-y-5">
              <DropZone onFileSelect={setFile} />

              <div>
                <p className="text-sm font-medium text-slate-400 mb-2">Recipients</p>
                <UserSearch selected={recipients} onToggle={toggleRecipient} />
              </div>

              {sendError && (
                <p className="text-sm text-red-400 animate-fade-in">{sendError}</p>
              )}

              <button
                id="send-file-btn"
                onClick={handleSend}
                disabled={!file || recipients.length === 0 || sending}
                className="btn-primary w-full py-3">
                {sending ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send to {recipients.length || ''} {recipients.length === 1 ? 'person' : recipients.length > 1 ? 'people' : '…'}
                  </>
                )}
              </button>
            </div>
          </section>

          {/* ── Transfers Panel ────────────────────────────── */}
          <section className="space-y-6">
            {/* Active */}
            <div>
              <h2 className="text-lg font-semibold text-slate-100 mb-4">
                Active Transfers
                {active.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-brand-400">({active.length})</span>
                )}
              </h2>
              {active.length === 0 ? (
                <div className="card p-8 text-center text-slate-600">
                  <p className="text-sm">No active transfers</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {active.map(t => <TransferCard key={t.transferId} transfer={t} />)}
                </div>
              )}
            </div>

            {/* History */}
            {history.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-100 mb-4">History</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {history.map(t => <TransferCard key={t.transferId} transfer={t} />)}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Incoming request modal (rendered at root z-level) */}
      <IncomingRequests />
    </div>
  );
}
