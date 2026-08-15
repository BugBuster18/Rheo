/**
 * DropShare — Presence Context
 * Tracks online/offline status of users in real time.
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const PresenceContext = createContext(null);

export function PresenceProvider({ children }) {
  const { isAuthenticated } = useAuth();
  // Map<userId, 'online'|'offline'>
  const [presence, setPresence] = useState(new Map());

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    if (!socket) return;

    const onOnline  = ({ userId }) => setPresence(p => new Map(p).set(userId, 'online'));
    const onOffline = ({ userId }) => setPresence(p => new Map(p).set(userId, 'offline'));

    socket.on('USER_ONLINE',  onOnline);
    socket.on('USER_OFFLINE', onOffline);

    return () => {
      socket.off('USER_ONLINE',  onOnline);
      socket.off('USER_OFFLINE', onOffline);
    };
  }, [isAuthenticated]);

  const isOnline = (userId) => presence.get(userId) === 'online';

  const queryPresence = (userIds) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('GET_PRESENCE', { userIds }, ({ success, presence: data }) => {
      if (!success) return;
      setPresence(prev => {
        const next = new Map(prev);
        Object.entries(data).forEach(([id, status]) => next.set(id, status));
        return next;
      });
    });
  };

  return (
    <PresenceContext.Provider value={{ presence, isOnline, queryPresence }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}
