import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { listNotifications, markAllRead, markRead, unreadCount } from './service.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    res.json({ notifications: listNotifications(userId), unread: unreadCount(userId) });
  }),
);

notificationsRouter.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    markAllRead(req.user!.id);
    res.json({ ok: true, unread: 0 });
  }),
);

notificationsRouter.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const ok = markRead(req.user!.id, req.params.id);
    res.json({ ok, unread: unreadCount(req.user!.id) });
  }),
);
