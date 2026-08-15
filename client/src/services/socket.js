/**
 * DropShare Client — Socket.IO singleton
 *
 * Creates ONE socket connection shared by the whole app.
 * Call initSocket(token) once after login.
 * Call getSocket() everywhere else.
 */
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

let socket = null;

export function initSocket(token) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
