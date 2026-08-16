/**
 * RHEO — User Search & Active Peers Discovery
 * Shows nearby/active users immediately. Search refines the list.
 * Clean, minimal layout.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../services/api';
import { usePresence } from '../contexts/PresenceContext';
import { useAuth } from '../contexts/AuthContext';
import Avatar, { getDefaultAvatar } from './Avatar';

export default function UserSearch({ selected, onToggle }) {
  const { user } = useAuth();
  const [query, setQuery]             = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [searching, setSearching]     = useState(false);
  const debounceRef = useRef(null);
  const { isOnline, queryPresence }   = usePresence();

  // Load all nearby/online users on mount
  useEffect(() => {
    const fetchActive = async () => {
      try {
        const res = await api.get('/users/search?q=');
        const users = (res.data.data?.users || []).filter(u => u.id !== user?.id);
        setNearbyUsers(users);
        if (users.length > 0) queryPresence(users.map(u => u.id));
      } catch {
        // silently fail — server may not support empty query
      }
    };
    fetchActive();
  }, [user?.id]);

  const search = useCallback((q) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
        const users = (res.data.data?.users || []).filter(u => u.id !== user?.id);
        setSearchResults(users);
        if (users.length > 0) queryPresence(users.map(u => u.id));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [queryPresence, user?.id]);

  // Which list to show
  const displayList = query.trim().length >= 2 ? searchResults : nearbyUsers;
  const showEmpty   = query.trim().length >= 2 && !searching && searchResults.length === 0;

  return (
    <div className="space-y-2.5">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          id="user-search-input"
          className="input pl-9 pr-9 text-sm bg-slate-50/60"
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Search by username…"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!searching && query && (
          <button
            onClick={() => { setQuery(''); setSearchResults([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Section label */}
      {displayList.length > 0 && (
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-0.5">
          {query.trim().length >= 2 ? `Results for "${query}"` : 'Active on Network'}
        </p>
      )}

      {/* User Pills List */}
      {displayList.length > 0 && (
        <div className="space-y-1">
          {displayList.map(u => {
            const isSelected = selected.some(s => s.id === u.id);
            const online = isOnline(u.id);
            const avatarId = getDefaultAvatar(u.username);

            return (
              <button
                key={u.id}
                id={`user-result-${u.id}`}
                onClick={() => onToggle(u)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-all border ${
                  isSelected
                    ? 'bg-teal-50 border-teal-300 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-teal-50/40'
                }`}
              >
                {/* Animal avatar */}
                <Avatar avatarId={avatarId} name={u.username} size="sm" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {u.display_name || u.username}
                    </span>
                    <span className="text-xs text-slate-400 font-mono truncate">@{u.username}</span>
                  </div>
                </div>

                {/* Online dot */}
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} />

                {/* Checkmark */}
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty search state */}
      {showEmpty && (
        <p className="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded-2xl border border-slate-200">
          No users found for "<span className="font-semibold text-slate-600">{query}</span>"
        </p>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {selected.map(u => (
            <span key={u.id} className="flex items-center gap-1.5 bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              <Avatar avatarId={getDefaultAvatar(u.username)} name={u.username} size="xs" className="!w-4 !h-4 !rounded-full text-xs" />
              @{u.username}
              <button onClick={() => onToggle(u)} className="text-teal-200 hover:text-white ml-0.5">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
