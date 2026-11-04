import { Router } from 'express';
import { z } from 'zod';
import { all, get, run } from '../../db/index.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';
import { getOrderDetail } from '../orders/service.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    const role = req.query.role as string | undefined;
    let sql = 'SELECT id, email, name, phone, role, is_active, created_at FROM users WHERE 1=1';
    const params: unknown[] = [];
    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    if (q) {
      sql += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    res.json({ users: all(sql, params) });
  }),
);

adminRouter.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        isActive: z.boolean().optional(),
        role: z.enum(['student', 'staff', 'owner', 'admin']).optional(),
      })
      .parse(req.body);
    if (req.params.id === req.user!.id && data.isActive === false) {
      throw badRequest('You cannot deactivate your own admin account');
    }
    const user = get<{ id: string }>('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!user) throw notFound('User not found');
    const sets: string[] = [];
    const params: unknown[] = [];
    if (data.isActive !== undefined) {
      sets.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }
    if (data.role) {
      sets.push('role = ?');
      params.push(data.role);
    }
    if (!sets.length) throw badRequest('No changes supplied');
    params.push(user.id);
    run(`UPDATE users SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`, params);
    audit({
      actorId: req.user!.id,
      action: 'admin.user_update',
      entityType: 'user',
      entityId: user.id,
      metadata: data,
      ip: req.ip,
    });
    res.json({ user: get('SELECT id, email, name, role, is_active FROM users WHERE id = ?', [user.id]) });
  }),
);

adminRouter.get(
  '/cafes',
  asyncHandler(async (_req, res) => {
    const cafes = all(
      `SELECT c.*, (SELECT COUNT(*) FROM orders o WHERE o.cafe_id = c.id) as order_count,
        (SELECT COUNT(*) FROM cafe_members m WHERE m.cafe_id = c.id) as member_count
       FROM cafes c ORDER BY created_at DESC`,
    );
    res.json({ cafes });
  }),
);

adminRouter.patch(
  '/cafes/:id',
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        isActive: z.boolean().optional(),
        isAcceptingOrders: z.boolean().optional(),
      })
      .parse(req.body);
    const cafe = get<{ id: string }>('SELECT id FROM cafes WHERE id = ?', [req.params.id]);
    if (!cafe) throw notFound('Cafe not found');
    const sets: string[] = [];
    const params: unknown[] = [];
    if (data.isActive !== undefined) {
      sets.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }
    if (data.isAcceptingOrders !== undefined) {
      sets.push('is_accepting_orders = ?');
      params.push(data.isAcceptingOrders ? 1 : 0);
    }
    if (!sets.length) throw badRequest('No changes supplied');
    params.push(cafe.id);
    run(`UPDATE cafes SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`, params);
    audit({ actorId: req.user!.id, action: 'admin.cafe_update', entityType: 'cafe', entityId: cafe.id, metadata: data, ip: req.ip });
    res.json({ ok: true });
  }),
);

adminRouter.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const cafeId = req.query.cafeId as string | undefined;
    const context = req.query.context as string | undefined; // 'active' | 'history'
    let sql = 'SELECT id FROM orders WHERE 1=1';
    const params: unknown[] = [];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    } else if (context === 'active') {
      sql += ` AND status IN ('awaiting_acceptance','accepted','preparing','ready','cancellation_requested')`;
    } else if (context === 'history') {
      sql += ` AND status IN ('collected','rejected','cancelled','refund_pending','refunded')`;
    }
    if (cafeId) {
      sql += ' AND cafe_id = ?';
      params.push(cafeId);
    }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    const ids = all<{ id: string }>(sql, params);
    res.json({
      orders: ids.map((r) => getOrderDetail(r.id)!).filter(Boolean),
      cafes: all<{ id: string; name: string }>('SELECT id, name FROM cafes ORDER BY name'),
    });
  }),
);

adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const orders = get<{ total: number; today: number }>(
      `SELECT COUNT(*) as total,
        SUM(CASE WHEN created_at >= datetime('now','start of day') THEN 1 ELSE 0 END) as today
       FROM orders`,
    );
    const byStatus = all<{ status: string; c: number }>(
      'SELECT status, COUNT(*) as c FROM orders GROUP BY status',
    );
    const revenue = get<{ revenue: number }>(
      `SELECT COALESCE(SUM(total_paise),0) as revenue FROM orders
       WHERE payment_status IN ('verified','partially_refunded') AND status != 'refunded'`,
    );
    const refunds = get<{ count: number; amount: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount_paise),0) as amount FROM refunds WHERE status != 'processed'`,
    );
    const users = get<{ students: number; staff: number }>(
      `SELECT SUM(CASE WHEN role='student' THEN 1 ELSE 0 END) as students,
        SUM(CASE WHEN role IN ('staff','owner') THEN 1 ELSE 0 END) as staff FROM users`,
    );
    const notificationFailures = get<{ c: number }>(
      `SELECT COUNT(*) as c FROM notifications WHERE status = 'failed'`,
    );
    const webhookEvents = get<{ c: number }>('SELECT COUNT(*) as c FROM webhook_events');
    res.json({
      orders: { total: Number(orders?.total ?? 0), today: Number(orders?.today ?? 0), byStatus },
      verifiedRevenuePaise: Number(revenue?.revenue ?? 0),
      pendingRefunds: { count: Number(refunds?.count ?? 0), amountPaise: Number(refunds?.amount ?? 0) },
      users: { students: Number(users?.students ?? 0), staff: Number(users?.staff ?? 0) },
      notificationFailures: Number(notificationFailures?.c ?? 0),
      webhookEvents: Number(webhookEvents?.c ?? 0),
    });
  }),
);

adminRouter.get(
  '/refunds',
  asyncHandler(async (_req, res) => {
    const refunds = all(
      `SELECT r.*, o.order_number, o.cafe_id, u.name as customer_name
       FROM refunds r JOIN orders o ON o.id = r.order_id JOIN users u ON u.id = o.customer_id
       ORDER BY r.created_at DESC LIMIT 200`,
    );
    res.json({ refunds });
  }),
);

adminRouter.get(
  '/notifications/failures',
  asyncHandler(async (_req, res) => {
    const failures = all(
      `SELECT n.*, u.email FROM notifications n JOIN users u ON u.id = n.user_id
       WHERE n.status = 'failed' ORDER BY n.created_at DESC LIMIT 200`,
    );
    res.json({ failures });
  }),
);

adminRouter.get(
  '/audit-logs',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const logs = all(
      `SELECT a.*, u.email as actor_email FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC LIMIT ?`,
      [limit],
    );
    res.json({ logs });
  }),
);
