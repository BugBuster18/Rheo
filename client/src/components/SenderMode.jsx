/**
 * DropShare — Sender Mode Component
 * Dedicated high-speed file sending panel.
 */
import { useState } from 'react';
import { useTransfer } from '../contexts/TransferContext';
import DropZone from './DropZone';
import UserSearch from './UserSearch';
import TransferCard from './TransferCard';

export default function SenderMode() {
  const { transfers, sendFile } = useTransfer();

  const [file, setFile]             = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [sending, setSending]       = useState(false);
  const [sendError, setSendError]   = useState('');

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
  const outboundTransfers = transferList.filter(t => t.direction === 'sending');
  const activeSends = outboundTransfers.filter(t => ['PENDING','ACCEPTED','TRANSFERRING','PAUSED'].includes(t.status));
  const completedSends = outboundTransfers.filter(t => ['COMPLETED','CANCELLED','FAILED','REJECTED','INTERRUPTED'].includes(t.status));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
      {/* ── Left Column: Send Configuration ────────────────────────────── */}
      <div className="lg:col-span-5 space-y-6">
        <div className="card-glass p-6 space-y-5 card-glow-brand border border-brand-500/20">
          <div className="flex items-center justify-between pb-3 border-b border-surface-600/50">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Files
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Select a file and choose recipients</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-300 font-mono">
              P2P Stream
            </span>
          </div>

          {/* Dropzone */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">1. Choose File</label>
            <DropZone file={file} onFileSelect={setFile} />
          </div>


          {/* User Search & Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">2. Select Recipients</label>
            <UserSearch selected={recipients} onToggle={toggleRecipient} />
          </div>

          {sendError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {sendError}
            </div>
          )}

          {/* Submit Action Button */}
          <button
            id="send-file-btn"
            onClick={handleSend}
            disabled={!file || recipients.length === 0 || sending}
            className="btn-primary w-full py-3.5 text-sm font-bold shadow-lg">
            {sending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Encrypting & Initiating Transfer…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send to {recipients.length ? `${recipients.length} Recipient${recipients.length > 1 ? 's' : ''}` : 'Recipients'}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Right Column: Outbound Activity ─────────────────────────────── */}
      <div className="lg:col-span-7 space-y-6">
        {/* Active Sending Streams */}
        <div>
          <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center justify-between">
            <span>Active Outbound Transfers</span>
            {activeSends.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-semibold">
                {activeSends.length} sending
              </span>
            )}
          </h3>

          {activeSends.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 space-y-2 border-dashed">
              <svg className="w-10 h-10 mx-auto text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <p className="text-sm font-medium text-slate-400">No active sending streams</p>
              <p className="text-xs text-slate-600">Select a file and recipient on the left to start sending.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSends.map(t => <TransferCard key={t.transferId} transfer={t} />)}
            </div>
          )}
        </div>

        {/* Sent History */}
        <div>
          <h3 className="text-lg font-bold text-slate-100 mb-4">
            Sent History
          </h3>

          {completedSends.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 space-y-2 border-dashed">
              <p className="text-sm font-medium text-slate-400">No sent history yet</p>
              <p className="text-xs text-slate-600">Past sent files will be logged here.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {completedSends.map(t => <TransferCard key={t.transferId} transfer={t} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
