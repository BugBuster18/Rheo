/**
 * DropShare — User Search Component
 * Search for users and select recipients for a file transfer.
 */
import { useState, useCallback } from 'react';
import api from '../services/api';
import { usePresence } from '../contexts/PresenceContext';

export default function UserSearch({ selected, onToggle }) {
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isOnline, queryPresence } = usePresence();

  const search = useCallback(async (q) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      const users = res.data.data.users || [];
      setResults(users);
      if (users.length > 0) {
        queryPresence(users.map(u => u.id));
      }
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [queryPresence]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          id="user-search-input"
          className="input pl-10"
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Search by username…"
        />
        {loading && (
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400 animate-spin"
            fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>

      {results.length > 0 && (
        <div className="bg-surface-700 border border-surface-500 rounded-xl overflow-hidden">
          {results.map((u, i) => {
            const isSelected = selected.some(s => s.id === u.id);
            const online = isOnline(u.id);
            return (
              <button
                key={u.id}
                id={`user-result-${u.id}`}
                onClick={() => onToggle(u)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                  ${i !== 0 ? 'border-t border-surface-600' : ''}
                  ${isSelected ? 'bg-brand-600/20' : 'hover:bg-surface-600'}`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-sm font-semibold">
                    {u.display_name?.[0] || u.username[0]}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 ${online ? 'badge-online' : 'badge-offline'}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{u.display_name || u.username}</p>
                  <p className="text-xs text-slate-500 truncate">@{u.username}</p>
                </div>

                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-surface-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(u => (
            <span key={u.id}
              className="flex items-center gap-1.5 bg-brand-600/20 border border-brand-500/40 text-brand-300
                         text-xs px-3 py-1 rounded-full">
              @{u.username}
              <button onClick={() => onToggle(u)} className="hover:text-white">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
