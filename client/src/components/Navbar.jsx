/**
 * RHEO — Creative Floating Dynamic Island Navbar
 * Sleek glassmorphic floating header with flowing wave brand mark,
 * active mode switcher, and profile modal trigger.
 */
import Avatar from './Avatar';

export default function Navbar({
  mode,
  setMode,
  user,
  currentAvatar,
  onOpenProfile,
  pendingRequestsCount = 0,
}) {
  return (
    <header className="sticky top-4 z-40 px-4 sm:px-8 max-w-6xl mx-auto w-full">
      <div className="card-glass px-4 sm:px-6 py-3 border border-slate-200/90 shadow-lg shadow-teal-900/5 rounded-3xl flex items-center justify-between gap-4">
        
        {/* Brand Logo & Flowing Stream Icon */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 via-teal-500 to-cyan-500 flex items-center justify-center shadow-md shadow-teal-500/20 text-white">
            <svg className="w-6 h-6 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              {/* Fluid Rheo wave symbol */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12c3-4 6-4 9 0s6 4 9 0M3 18c3-4 6-4 9 0s6 4 9 0" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-teal-900 to-teal-700 bg-clip-text text-transparent font-mono">
                RHEO
              </span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 font-mono tracking-wider">
                Flow
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Real-Time P2P Mesh</p>
          </div>
        </div>

        {/* Central Mode Switcher Pill */}
        <nav aria-label="Mode Navigation" className="flow-pill-container flex items-center gap-1">
          <button
            onClick={() => setMode('sender')}
            className={`flow-pill-btn flex items-center gap-2 ${mode === 'sender' ? 'active-tab' : ''}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="hidden xs:inline">Send Flow</span>
          </button>

          <button
            onClick={() => setMode('receiver')}
            className={`flow-pill-btn flex items-center gap-2 relative ${mode === 'receiver' ? 'active-tab' : ''}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
            <span className="hidden xs:inline">Receive Flow</span>
            {pendingRequestsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute top-1 right-1" />
            )}
          </button>
        </nav>

        {/* User Profile Pill */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-2xl bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/80 transition-all hover:scale-[1.02] active:scale-95 group"
            title="Open Profile & Activities"
          >
            <div className="relative">
              <Avatar avatarId={currentAvatar} name={user?.displayName || user?.username} size="sm" />
              <span className="absolute -bottom-0.5 -right-0.5 badge-online ring-2 ring-white" />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-bold text-slate-800 leading-none group-hover:text-teal-700 transition-colors">
                {user?.displayName || user?.username}
              </p>
              <p className="text-[10px] text-teal-600 font-mono mt-0.5">@{user?.username}</p>
            </div>
            <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

      </div>
    </header>
  );
}
