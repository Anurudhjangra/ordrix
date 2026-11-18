import { Manager, Socket } from 'socket.io-client';
import type { AuthUser } from '../store/auth';

export const SOCKET_URL = '/';
export const POLL_FALLBACK_MS = 8000;

const manager = new Manager(SOCKET_URL, {
  autoConnect: false,
  // The auth cookie is httpOnly. The browser must send it with the handshake;
  // JavaScript cannot read it from document.cookie.
  withCredentials: true,
  path: '/socket.io',
  transports: ['websocket', 'polling'],
});

let socket: Socket | null = null;
let currentUser: AuthUser | null = null;

export function connectSocket(user: AuthUser): Socket {
  if (socket && currentUser?.id === user.id) return socket;
  disconnectSocket();
  currentUser = user;
  socket = manager.socket('/');
  socket.connect();
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

/**
 * Subscribe to a callback for a socket event. Returns an unsubscribe fn.
 * When a socket is not available the caller arranges polling via
 * POLL_FALLBACK_MS as a fallback.
 */
export function onSocket<T>(event: string, cb: (payload: T) => void): () => void {
  const s = getSocket();
  if (!s) return () => undefined;
  s.on(event, cb);
  return () => s.off(event, cb);
}

export function emitSocket(event: string, ...args: unknown[]): void {
  getSocket()?.emit(event, ...args);
}