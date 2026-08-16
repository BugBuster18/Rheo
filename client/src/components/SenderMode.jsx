/**
 * RHEO — Sender Mode Component
 * Clean layout for choosing file, discovering receivers via radar, and streaming files.
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
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  // Filter transfers to only show outgoing transfers
  const transferList = Array.from(transfers.values());
  const mySentTransfers = transferList.filter(t => t.direction === 'sending');
  const activeSends = mySentTransfers.filter(t => ['PENDING', 'ACCEPTED', 'TRANSFERRING', 'PAUSED'].includes(t.status));
  const completedSends = mySentTransfers.filter(t => ['COMPLETED', 'CANCELLED', 'FAILED', 'REJECTED'].includes(t.status));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
      {/* ── Left Column: Compose Transfer ─────────────────────────────────── */}
      <div className="lg:col-span-6 space-y-6">
        <div className="card-clean p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              Initiate Outgoing Stream
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Send Files Instantly</h2>
            <p className="text-xs text-slate-500 mt-1">Files are chunked and streamed directly over WebSocket relay with SHA-256 integrity.</p>
          </div>

          {/* Step 1: Dropzone */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              1. Select File
            </label>
            <DropZone file={file} onFileSelect={setFile} />
          </div>

          {/* Step 2: User Search & Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                2. Target Receiver Node
              </label>
              {recipients.length > 0 && (
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                  {recipients.length} Selected
                </span>
              )}
            </div>
            <UserSearch selected={recipients} onToggle={toggleRecipient} />
          </div>

          {/* Error display */}
          {sendError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <span>⚠️</span>
              <span>{sendError}</span>
            </div>
          )}

          {/* Submit Action */}
          <button
            id="send-button"
            onClick={handleSend}
            disabled={!file || recipients.length === 0 || sending}
            className="btn-teal w-full py-4 text-sm font-extrabold rounded-2xl shadow-xl shadow-teal-700/15 flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Initiating P2P Flow…</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <span>Flow to {recipients.length > 0 ? `${recipients.length} Receiver${recipients.length > 1 ? 's' : ''}` : 'Recipient'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Right Column: Active & Outgoing Streams ────────────────────────── */}
      <div className="lg:col-span-6 space-y-6">
        {/* Active Outgoing Streams */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>Active Outgoing Streams</span>
              {activeSends.length > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold">
                  {activeSends.length} live
                </span>
              )}
            </h3>
          </div>

          {activeSends.length === 0 ? (
            <div className="card-clean p-8 text-center text-slate-400 space-y-2 border-dashed">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm font-bold text-slate-700">No active streams in flight</p>
              <p className="text-xs text-slate-400">When you stream a file, real-time chunk progress will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSends.map(t => <TransferCard key={t.transferId} transfer={t} />)}
            </div>
          )}
        </div>

        {/* Recent Outgoing History */}
        {completedSends.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-800">Recent Completed Sends</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {completedSends.map(t => <TransferCard key={t.transferId} transfer={t} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
