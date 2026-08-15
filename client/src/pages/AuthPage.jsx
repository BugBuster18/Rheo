/**
 * Login / Register Page
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function AuthPage() {
  const [mode, setMode]       = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail]       = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await api.post('/auth/register', { username, password, email, displayName });
        await login(username, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full
                        bg-brand-600/15 blur-3xl" />
      </div>

      <div className="card-glass p-8 w-full max-w-md animate-fade-in relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/40">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">DropShare</h1>
            <p className="text-xs text-slate-500">Real-time file transfer</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-surface-700 rounded-xl p-1 mb-6">
          {['login', 'register'].map(m => (
            <button key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${mode === m
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'}`}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Display Name</label>
                <input id="displayName" className="input" value={displayName}
                  onChange={e => setDisplayName(e.target.value)} placeholder="Ganesh Kumar" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Email</label>
                <input id="email" type="email" className="input" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="ganesh@example.com" />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Username</label>
            <input id="username" className="input" value={username}
              onChange={e => setUsername(e.target.value)} placeholder="ganesh" required />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Password</label>
            <input id="password" type="password" className="input" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <button id="submit-auth" type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
            {loading ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
