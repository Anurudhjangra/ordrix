import { all, get, run } from '../../db/index.js';
import { id } from '../../lib/ids.js';
import { bus, EVENTS } from '../../lib/bus.js';

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

export interface CreateNotificationInput {
  userId: string;
  orderId?: string | null;
  type: string;
  title: string;
  body?: string;
  channel?: NotificationChannel;
}

interface NotificationRow {
  id: string;
  user_id: string;
  order_id: string | null;
  type: string;
  title: string;
  body: string | null;
  channel: NotificationChannel;
  status: 'pending' | 'sent' | 'failed';
  is_read: number;
  error: string | null;
  created_at: string;
  delivered_at: string | null;
}

/**
 * Create an in-app notification and best-effort attempt external channels.
 *
 * External channels (email/sms/push) are NOT configured in the MVP. Rather than
 * silently pretend they work, we record them with status 'failed' and an
 * explanatory error so failures are visible. In-app notifications always post.
 */
export function createNotification(input: CreateNotificationInput): NotificationRow {
  const notificationId = id();
  const channel = input.channel ?? 'in_app';

  const notConfigured = channel !== 'in_app';
  const status: NotificationRow['status'] = notConfigured ? 'failed' : 'sent';
  const error = notConfigured
    ? `${channel} delivery is not configured (no provider credentials). Recorded for audit.`
    : null;

  run(
    `INSERT INTO notifications (id, user_id, order_id, type, title, body, channel, status, error, delivered_at)
     VALUES (?,?,?,?,?,?,?,?,?, CASE WHEN ? = 'sent' THEN datetime('now') ELSE NULL END)`,
    [
      notificationId,
      input.userId,
      input.orderId ?? null,
      input.type,
      input.title,
      input.body ?? null,
      channel,
      status,
      error,
      status,
    ],
  );

  const row = get<NotificationRow>('SELECT * FROM notifications WHERE id = ?', [notificationId])!;
  try {
    bus.emit(EVENTS.NOTIFICATION_CREATED, row);
  } catch {
    /* real-time delivery failures must never break the write */
  }
  return row;
}

export function listNotifications(userId: string, limit = 50): NotificationRow[] {
  return all<NotificationRow>(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, limit],
  );
}

export function unreadCount(userId: string): number {
  const row = get<{ c: number }>(
    'SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId],
  );
  return Number(row?.c ?? 0);
}

export function markRead(userId: string, notificationId: string): boolean {
  const result = run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [
    notificationId,
    userId,
  ]);
  return Number(result.changes) > 0;
}

export function markAllRead(userId: string): void {
  run('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
}
