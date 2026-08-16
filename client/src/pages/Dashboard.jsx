/**
 * RHEO — Main Dashboard Page
 * Orchestrates the floating dynamic navbar, active Flow mode (Send / Receive),
 * customizable avatar system, and profile/activity modal.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTransfer } from '../contexts/TransferContext';
import Navbar from '../components/Navbar';
import SenderMode from '../components/SenderMode';
import ReceiverMode from '../components/ReceiverMode';
import ProfileModal from '../components/ProfileModal';
import IncomingRequests from '../components/IncomingRequests';

export default function Dashboard() {
  const { user } = useAuth();
  const { pendingRequests } = useTransfer();
  const [mode, setMode] = useState('sender'); // 'sender' | 'receiver'
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(() => {
    return localStorage.getItem('ds_avatar') || 'flow-teal';
  });

  const handleSelectAvatar = (avatarId) => {
    setCurrentAvatar(avatarId);
    localStorage.setItem('ds_avatar', avatarId);
  };

  // If there are pending incoming requests and user is on sender mode, give subtle cue
  useEffect(() => {
    if (pendingRequests && pendingRequests.length > 0) {
      // User can switch or handle via floating notification
    }
  }, [pendingRequests]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col relative selection:bg-teal-500 selection:text-white">
      {/* Mesh grid background */}
      <div className="fixed inset-0 bg-mesh-grid pointer-events-none z-0 opacity-40" />

      {/* Floating Dynamic Island Navbar */}
      <Navbar
        mode={mode}
        setMode={setMode}
        user={user}
        currentAvatar={currentAvatar}
        onOpenProfile={() => setIsProfileOpen(true)}
        pendingRequestsCount={pendingRequests?.length || 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-10 relative z-10">
        {mode === 'sender' ? (
          <SenderMode />
        ) : (
          <ReceiverMode />
        )}
      </main>

      {/* Floating Incoming Transfer Alerts */}
      <IncomingRequests />

      {/* Profile & Activity Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentAvatar={currentAvatar}
        onSelectAvatar={handleSelectAvatar}
      />

      {/* Clean Modern Footer */}
      <footer className="relative z-10 border-t border-slate-200/80 py-6 px-4 sm:px-8 bg-white/50 backdrop-blur-sm text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 tracking-wider">RHEO</span>
            <span>·</span>
            <span>Real-Time P2P Flow Mesh</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-teal-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              Node WebSocket Relay Connected
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
