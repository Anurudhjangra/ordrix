import type { Server as HttpServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { isAllowedOrigin } from './config.js';
import { tokenFromRequest, verifyToken } from './lib/auth.js';
import { bus, EVENTS } from './lib/bus.js';
import { getDb } from './db/index.js';

let io: SocketServer | null = null;

/**
 * Attach Socket.IO for live order/notification updates.
 *
 * Sockets are a convenience layer only: order correctness is always enforced by
 * the REST API and persisted in the database, and clients poll as a fallback
 * when a socket is unavailable.
 */
export function initRealtime(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
      credentials: true,
    },
  });

  // Authenticate the socket using the same httpOnly cookie / bearer token.
  io.use((socket, next) => {
    const token =
      tokenFromRequest(socket.request as never) ??
      (socket.handshake.auth?.token as string | undefined) ??
      null;
    if (!token) return next();
    const payload = verifyToken(token);
    if (payload) socket.data.user = payload;
    next();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as { sub: string; role: string } | undefined;
    if (user) {
      socket.join(`user:${user.sub}`);

      // Staff/owner join their cafe rooms; admin joins all cafe rooms.
      if (user.role === 'admin') {
        for (const cafe of getCafeIds()) socket.join(`cafe:${cafe}`);
      } else if (user.role === 'owner' || user.role === 'staff') {
        const memberships = getCafeMemberships(user.sub);
        for (const cafeId of memberships) socket.join(`cafe:${cafeId}`);
      }
    }

    socket.on('order:subscribe', (orderId: unknown) => {
      if (typeof orderId === 'string') socket.join(`order:${orderId}`);
    });
  });

  bus.on(EVENTS.ORDER_CREATED, (payload: { cafeId: string; orderId: string }) => {
    io?.to(`cafe:${payload.cafeId}`).emit('order:created', payload);
  });
  bus.on(EVENTS.ORDER_UPDATED, (payload: { cafeId: string; orderId: string }) => {
    io?.to(`cafe:${payload.cafeId}`).emit('order:updated', payload);
    io?.to(`order:${payload.orderId}`).emit('order:updated', payload);
  });
  bus.on(EVENTS.NOTIFICATION_CREATED, (row: { user_id: string }) => {
    io?.to(`user:${row.user_id}`).emit('notification:new', row);
  });

  return io;
}

function getCafeIds(): string[] {
  return (getDb().prepare('SELECT id FROM cafes').all() as { id: string }[]).map((r) => r.id);
}

function getCafeMemberships(userId: string): string[] {
  return (
    getDb()
      .prepare('SELECT cafe_id FROM cafe_members WHERE user_id = ?')
      .all(userId) as { cafe_id: string }[]
  ).map((r) => r.cafe_id);
}

export function getIo(): SocketServer | null {
  return io;
}
