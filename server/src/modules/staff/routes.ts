import { Router } from 'express';
import { z } from 'zod';
import { all, get, run, tx } from '../../db/index.js';
import { id } from '../../lib/ids.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';
import { getSlotAvailability, getSlotById } from '../../lib/slots.js';
import {
  completeRefund,
  getOrderDetail,
  updateOrderStatus,
  flagTimedOutOrders,
  type OrderStatus,
} from '../orders/service.js';
import { findToken } from '../../lib/pickup.js';
import { getSettings, setSetting } from '../../lib/settings.js';
import fs from 'node:fs';
import path from 'node:path';
import { SERVER_ROOT } from '../../config.js';

export const staffRouter = Router();
staffRouter.use(requireAuth);
staffRouter.use(requireRole('owner', 'staff', 'admin'));

function staffCafeIds(user: { id: string; role: string }): string[] {
  if (user.role === 'admin') {
    return all<{ id: string }>('SELECT id FROM cafes').map((c) => c.id);
  }
  return all<{ cafe_id: string }>('SELECT cafe_id FROM cafe_members WHERE user_id = ?', [user.id]).map(
    (m) => m.cafe_id,
  );
}

function resolveCafeId(user: { id: string; role: string }, requested?: string): string {
  const allowed = staffCafeIds(user);
  if (requested) {
    if (!allowed.includes(requested)) throw forbidden('You do not manage this cafe');
    return requested;
  }
  if (allowed.length === 0) throw forbidden('You are not assigned to any cafe');
  return allowed[0];
}

function assertOrderAccess(user: { id: string; role: string }, cafeId: string): void {
  if (user.role === 'admin') return;
  if (!staffCafeIds(user).includes(cafeId)) throw forbidden('This order belongs to another cafe');
}

function staffCafes(user: { id: string; role: string }): { id: string; name: string }[] {
  if (user.role === 'admin') {
    return all<{ id: string; name: string }>('SELECT id, name FROM cafes ORDER BY name');
  }
  return all<{ id: string; name: string }>(
    `SELECT c.id, c.name FROM cafes c
     JOIN cafe_members m ON m.cafe_id = c.id
     WHERE m.user_id = ? ORDER BY c.name`,
    [user.id],
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
staffRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    flagTimedOutOrders();
    const cafeId = resolveCafeId(req.user!, req.query.cafeId as string | undefined);
    const counts = all<{ status: string; c: number }>(
      'SELECT status, COUNT(*) as c FROM orders WHERE cafe_id = ? GROUP BY status',
      [cafeId],
    );
    const byStatus = Object.fromEntries(counts.map((r) => [r.status, Number(r.c)]));

    const todayStart = `datetime('now','start of day')`;
    const today = get<{ c: number }>(
      `SELECT COUNT(*) as c FROM orders WHERE cafe_id = ? AND created_at >= ${todayStart}`,
      [cafeId],
    );
    const sales = get<{ revenue: number; orders: number }>(
      `SELECT COALESCE(SUM(total_paise),0) as revenue, COUNT(*) as orders
       FROM orders WHERE cafe_id = ? AND payment_status IN ('verified','partially_refunded') AND status NOT IN ('refunded')`,
      [cafeId],
    );
    const pendingPayments = get<{ c: number; amount: number }>(
      `SELECT COUNT(*) as c, COALESCE(SUM(total_paise),0) as amount FROM orders
       WHERE cafe_id = ? AND payment_status IN ('created','pending') AND status NOT IN ('cancelled','rejected','refunded')`,
      [cafeId],
    );
    const refunds = get<{ count: number; amount: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount_paise),0) as amount FROM refunds r
       JOIN orders o ON o.id = r.order_id WHERE o.cafe_id = ? AND r.status != 'processed'`,
      [cafeId],
    );
    const workload = get<{ c: number }>(
      `SELECT COUNT(*) as c FROM orders WHERE cafe_id = ? AND status IN ('accepted','preparing')`,
      [cafeId],
    );

    res.json({
      cafeId,
      cafes: staffCafes(req.user!),
      orders: {
        new: (byStatus.awaiting_acceptance ?? 0),
        awaitingAcceptance: byStatus.awaiting_acceptance ?? 0,
        accepted: byStatus.accepted ?? 0,
        preparing: byStatus.preparing ?? 0,
        ready: byStatus.ready ?? 0,
        collected: byStatus.collected ?? 0,
        rejected: byStatus.rejected ?? 0,
        cancellationRequested: byStatus.cancellation_requested ?? 0,
        cancelled: byStatus.cancelled ?? 0,
        refundPending: byStatus.refund_pending ?? 0,
        refunded: byStatus.refunded ?? 0,
        today: Number(today?.c ?? 0),
      },
      sales: {
        // Verified sales only. Pending/refunded amounts are reported separately
        // so they are never mixed into a misleading revenue figure.
        verifiedRevenuePaise: Number(sales?.revenue ?? 0),
        verifiedOrderCount: Number(sales?.orders ?? 0),
        pendingPaymentsPaise: Number(pendingPayments?.amount ?? 0),
        pendingPaymentCount: Number(pendingPayments?.c ?? 0),
        pendingRefundCount: Number(refunds?.count ?? 0),
        pendingRefundPaise: Number(refunds?.amount ?? 0),
      },
      workload: Number(workload?.c ?? 0),
      settings: getSettings(),
    });
  }),
);

// ---------------------------------------------------------------------------
// Live order queue
// ---------------------------------------------------------------------------
staffRouter.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const cafeId = resolveCafeId(req.user!, req.query.cafeId as string | undefined);
    const status = req.query.status as string | undefined;
    const context = req.query.context as string | undefined; // 'active' | 'history' | undefined
    let sql = 'SELECT id FROM orders WHERE cafe_id = ?';
    const params: unknown[] = [cafeId];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    } else if (context === 'active') {
      sql += ` AND status IN ('awaiting_acceptance','accepted','preparing','ready','cancellation_requested')`;
    } else if (context === 'history') {
      sql += ` AND status IN ('collected','rejected','cancelled','refunded','refund_pending')`;
    }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    const ids = all<{ id: string }>(sql, params);
    res.json({ orders: ids.map((r) => getOrderDetail(r.id)!).filter(Boolean) });
  }),
);

staffRouter.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const order = getOrderDetail(req.params.id);
    if (!order) throw notFound('Order not found');
    assertOrderAccess(req.user!, order.cafe_id);
    res.json({ order });
  }),
);

function action(
  to: OrderStatus,
  actionName: string,
  opts: { reason?: boolean } = {},
) {
  return asyncHandler(async (req, res) => {
    const order = getOrderDetail(req.params.id);
    if (!order) throw notFound('Order not found');
    assertOrderAccess(req.user!, order.cafe_id);
    const reason = opts.reason ? (req.body?.reason as string | undefined) : undefined;
    const updated = updateOrderStatus(order.id, to, req.user!.id, req.body?.note, { reason });
    audit({
      actorId: req.user!.id,
      action: `order.${actionName}`,
      entityType: 'order',
      entityId: order.id,
      metadata: { from: order.status, to },
      ip: req.ip,
    });
    res.json({ order: updated });
  });
}

staffRouter.post('/orders/:id/accept', action('accepted', 'accept'));
staffRouter.post('/orders/:id/reject', action('rejected', 'reject', { reason: true }));
staffRouter.post('/orders/:id/preparing', action('preparing', 'preparing'));
staffRouter.post('/orders/:id/ready', action('ready', 'ready'));
staffRouter.post('/orders/:id/cancel', action('cancelled', 'cancel', { reason: true }));
staffRouter.post('/orders/:id/refund', asyncHandler(async (req, res) => {
  const order = getOrderDetail(req.params.id);
  if (!order) throw notFound('Order not found');
  assertOrderAccess(req.user!, order.cafe_id);
  const updated = completeRefund(order.id, req.user!.id, req.body?.providerRefundId);
  audit({ actorId: req.user!.id, action: 'order.refund_complete', entityType: 'order', entityId: order.id, ip: req.ip });
  res.json({ order: updated });
}));

// ---------------------------------------------------------------------------
// Pickup verification
// ---------------------------------------------------------------------------
staffRouter.post(
  '/pickup/verify',
  asyncHandler(async (req, res) => {
    const token = z.string().min(3).max(20).parse(req.body?.token);
    const cafeId = resolveCafeId(req.user!, req.body?.cafeId);
    const found = findToken(cafeId, token);
    if (!found) throw notFound('No order matches that pickup token at this cafe');
    const order = getOrderDetail(found.order_id);
    if (!order) throw notFound('Order not found');
    assertOrderAccess(req.user!, order.cafe_id);
    res.json({
      order,
      token: { value: found.token, isUsed: found.is_used === 1, usedAt: found.used_at },
      canCollect: order.status === 'ready' && found.is_used === 0,
    });
  }),
);

staffRouter.post(
  '/pickup/collect',
  asyncHandler(async (req, res) => {
    const token = z.string().min(3).max(20).parse(req.body?.token);
    const cafeId = resolveCafeId(req.user!, req.body?.cafeId);
    const found = findToken(cafeId, token);
    if (!found) throw notFound('No order matches that pickup token at this cafe');
    const order = getOrderDetail(found.order_id);
    if (!order) throw notFound('Order not found');
    assertOrderAccess(req.user!, order.cafe_id);

    if (found.is_used === 1) throw conflict('This pickup token has already been used');
    if (order.status === 'collected') throw conflict('This order was already collected');
    if (order.status !== 'ready') throw conflict(`Order is not ready for pickup (current status: ${order.status})`);

    const updated = updateOrderStatus(order.id, 'collected', req.user!.id, 'Pickup verified');
    audit({
      actorId: req.user!.id,
      action: 'pickup.collect',
      entityType: 'order',
      entityId: order.id,
      metadata: { token: found.token },
      ip: req.ip,
    });
    res.json({ order: updated });
  }),
);

// ---------------------------------------------------------------------------
// Cafe operations
// ---------------------------------------------------------------------------
staffRouter.post(
  '/cafe/accepting',
  asyncHandler(async (req, res) => {
    const cafeId = resolveCafeId(req.user!, req.body?.cafeId);
    const isAccepting = z.boolean().parse(req.body?.isAccepting);
    const reason = req.body?.reason as string | undefined;
    run(
      `UPDATE cafes SET is_accepting_orders = ?, pause_reason = ?, updated_at = datetime('now') WHERE id = ?`,
      [isAccepting ? 1 : 0, isAccepting ? null : reason ?? 'Online orders paused by staff', cafeId],
    );
    audit({
      actorId: req.user!.id,
      action: 'cafe.accepting',
      entityType: 'cafe',
      entityId: cafeId,
      metadata: { isAccepting, reason },
      ip: req.ip,
    });
    res.json({ ok: true, isAcceptingOrders: isAccepting });
  }),
);

staffRouter.get(
  '/slots',
  asyncHandler(async (req, res) => {
    const cafeId = resolveCafeId(req.user!, req.query.cafeId as string | undefined);
    res.json({ slots: getSlotAvailability(cafeId) });
  }),
);

const slotSchema = z.object({
  label: z.string().min(1).max(60),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  capacity: z.number().int().min(0).max(500),
  isActive: z.boolean().optional(),
});

staffRouter.post(
  '/slots',
  asyncHandler(async (req, res) => {
    const cafeId = resolveCafeId(req.user!, req.body?.cafeId);
    const data = slotSchema.parse(req.body);
    const slotId = id();
    run(
      `INSERT INTO pickup_slots (id, cafe_id, label, start_time, end_time, capacity, is_active, sort_order)
       VALUES (?,?,?,?,?,?,?, (SELECT COALESCE(MAX(sort_order),0)+1 FROM pickup_slots WHERE cafe_id = ?))`,
      [slotId, cafeId, data.label, data.startTime, data.endTime, data.capacity, data.isActive === false ? 0 : 1, cafeId],
    );
    res.status(201).json({ slot: getSlotById(cafeId, slotId) });
  }),
);

staffRouter.patch(
  '/slots/:id',
  asyncHandler(async (req, res) => {
    const cafeId = resolveCafeId(req.user!, req.body?.cafeId);
    const existing = getSlotById(cafeId, req.params.id);
    if (!existing) throw notFound('Slot not found');
    const data = slotSchema.partial().parse(req.body);
    run(
      `UPDATE pickup_slots SET label = ?, start_time = ?, end_time = ?, capacity = ?, is_active = ? WHERE id = ?`,
      [
        data.label ?? existing.label,
        data.startTime ?? existing.start_time,
        data.endTime ?? existing.end_time,
        data.capacity ?? existing.capacity,
        data.isActive === undefined ? existing.is_active : data.isActive ? 1 : 0,
        existing.id,
      ],
    );
    res.json({ slot: getSlotById(cafeId, existing.id) });
  }),
);

staffRouter.delete(
  '/slots/:id',
  asyncHandler(async (req, res) => {
    const cafeId = resolveCafeId(req.user!, req.query.cafeId as string | undefined);
    const existing = getSlotById(cafeId, req.params.id);
    if (!existing) throw notFound('Slot not found');
    run('UPDATE pickup_slots SET is_active = 0 WHERE id = ?', [existing.id]);
    res.json({ ok: true });
  }),
);

staffRouter.put(
  '/settings',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      taxPercent: z.number().min(0).max(50).optional(),
      serviceFeePaise: z.number().int().min(0).optional(),
      orderAcceptTimeoutMinutes: z.number().int().min(1).max(120).optional(),
    });
    const data = schema.parse(req.body);
    if (data.taxPercent !== undefined) setSetting('tax_percent', String(data.taxPercent));
    if (data.serviceFeePaise !== undefined) setSetting('service_fee_paise', String(data.serviceFeePaise));
    if (data.orderAcceptTimeoutMinutes !== undefined)
      setSetting('order_accept_timeout_minutes', String(data.orderAcceptTimeoutMinutes));
    res.json({ settings: getSettings() });
  }),
);

// ---------------------------------------------------------------------------
// Menu management
// ---------------------------------------------------------------------------
staffRouter.get(
  '/menu',
  asyncHandler(async (req, res) => {
    const cafeId = resolveCafeId(req.user!, req.query.cafeId as string | undefined);
    const categories = all(
      'SELECT * FROM menu_categories WHERE cafe_id = ? ORDER BY sort_order, name',
      [cafeId],
    );
    const items = all(
      'SELECT * FROM menu_items WHERE cafe_id = ? ORDER BY sort_order, name',
      [cafeId],
    );
    res.json({ categories, items });
  }),
);

staffRouter.post(
  '/menu/categories',
  asyncHandler(async (req, res) => {
    const cafeId = resolveCafeId(req.user!, req.body?.cafeId);
    const data = z
      .object({ name: z.string().min(1).max(60), isActive: z.boolean().optional() })
      .parse(req.body);
    const categoryId = id();
    run(
      `INSERT INTO menu_categories (id, cafe_id, name, is_active, sort_order)
       VALUES (?,?,?,?, (SELECT COALESCE(MAX(sort_order),0)+1 FROM menu_categories WHERE cafe_id = ?))`,
      [categoryId, cafeId, data.name, data.isActive === false ? 0 : 1, cafeId],
    );
    res.status(201).json({ category: get('SELECT * FROM menu_categories WHERE id = ?', [categoryId]) });
  }),
);

staffRouter.patch(
  '/menu/categories/:id',
  asyncHandler(async (req, res) => {
    const data = z
      .object({ name: z.string().min(1).max(60).optional(), isActive: z.boolean().optional() })
      .parse(req.body);
    const cat = get<{ id: string; cafe_id: string; name: string; is_active: number }>(
      'SELECT * FROM menu_categories WHERE id = ?',
      [req.params.id],
    );
    if (!cat) throw notFound('Category not found');
    assertOrderAccess(req.user!, cat.cafe_id);
    run('UPDATE menu_categories SET name = ?, is_active = ? WHERE id = ?', [
      data.name ?? cat.name,
      data.isActive === undefined ? cat.is_active : data.isActive ? 1 : 0,
      cat.id,
    ]);
    res.json({ category: get('SELECT * FROM menu_categories WHERE id = ?', [cat.id]) });
  }),
);

const itemSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(80),
  description: z.string().max(400).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  pricePaise: z.number().int().min(0),
  isVeg: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  prepMinutes: z.number().int().min(0).max(120).optional(),
});

staffRouter.post(
  '/menu/items',
  asyncHandler(async (req, res) => {
    const cafeId = resolveCafeId(req.user!, req.body?.cafeId);
    const data = itemSchema.parse(req.body);
    const category = get<{ id: string; cafe_id: string }>(
      'SELECT id, cafe_id FROM menu_categories WHERE id = ?',
      [data.categoryId],
    );
    if (!category || category.cafe_id !== cafeId) throw badRequest('Invalid category');
    const itemId = id();
    run(
      `INSERT INTO menu_items (id, cafe_id, category_id, name, description, image_url, price_paise, is_veg, is_available, prep_minutes, sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?, (SELECT COALESCE(MAX(sort_order),0)+1 FROM menu_items WHERE category_id = ?))`,
      [
        itemId,
        cafeId,
        data.categoryId,
        data.name,
        data.description ?? null,
        data.imageUrl ?? null,
        data.pricePaise,
        data.isVeg === false ? 0 : 1,
        data.isAvailable === false ? 0 : 1,
        data.prepMinutes ?? 5,
        data.categoryId,
      ],
    );
    audit({ actorId: req.user!.id, action: 'menu.item_create', entityType: 'menu_item', entityId: itemId, ip: req.ip });
    res.status(201).json({ item: get('SELECT * FROM menu_items WHERE id = ?', [itemId]) });
  }),
);

staffRouter.patch(
  '/menu/items/:id',
  asyncHandler(async (req, res) => {
    const item = get<{ id: string; cafe_id: string }>('SELECT id, cafe_id FROM menu_items WHERE id = ?', [
      req.params.id,
    ]);
    if (!item) throw notFound('Menu item not found');
    assertOrderAccess(req.user!, item.cafe_id);
    const data = itemSchema.partial().parse(req.body);
    if (data.categoryId) {
      const category = get<{ id: string; cafe_id: string }>(
        'SELECT id, cafe_id FROM menu_categories WHERE id = ?',
        [data.categoryId],
      );
      if (!category || category.cafe_id !== item.cafe_id) throw badRequest('Invalid category');
    }
    const sets: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, unknown> = {
      category_id: data.categoryId,
      name: data.name,
      description: data.description,
      image_url: data.imageUrl,
      price_paise: data.pricePaise,
      is_veg: data.isVeg === undefined ? undefined : data.isVeg ? 1 : 0,
      is_available: data.isAvailable === undefined ? undefined : data.isAvailable ? 1 : 0,
      prep_minutes: data.prepMinutes,
    };
    for (const [col, value] of Object.entries(map)) {
      if (value !== undefined) {
        sets.push(`${col} = ?`);
        params.push(value);
      }
    }
    if (!sets.length) throw badRequest('No changes supplied');
    sets.push("updated_at = datetime('now')");
    params.push(item.id);
    run(`UPDATE menu_items SET ${sets.join(', ')} WHERE id = ?`, params);
    audit({ actorId: req.user!.id, action: 'menu.item_update', entityType: 'menu_item', entityId: item.id, ip: req.ip });
    res.json({ item: get('SELECT * FROM menu_items WHERE id = ?', [item.id]) });
  }),
);

staffRouter.delete(
  '/menu/items/:id',
  asyncHandler(async (req, res) => {
    const item = get<{ id: string; cafe_id: string }>('SELECT id, cafe_id FROM menu_items WHERE id = ?', [
      req.params.id,
    ]);
    if (!item) throw notFound('Menu item not found');
    assertOrderAccess(req.user!, item.cafe_id);
    // Soft-hide rather than hard delete so historical orders remain intact.
    run("UPDATE menu_items SET is_available = 0, updated_at = datetime('now') WHERE id = ?", [item.id]);
    audit({ actorId: req.user!.id, action: 'menu.item_hide', entityType: 'menu_item', entityId: item.id, ip: req.ip });
    res.json({ ok: true });
  }),
);

staffRouter.post(
  '/menu/items/:id/options',
  asyncHandler(async (req, res) => {
    const item = get<{ id: string; cafe_id: string }>('SELECT id, cafe_id FROM menu_items WHERE id = ?', [
      req.params.id,
    ]);
    if (!item) throw notFound('Menu item not found');
    assertOrderAccess(req.user!, item.cafe_id);
    const data = z
      .object({
        groupName: z.string().min(1).max(40).default('Options'),
        name: z.string().min(1).max(60),
        priceDeltaPaise: z.number().int(),
      })
      .parse(req.body);
    const optionId = id();
    run(
      `INSERT INTO menu_item_options (id, menu_item_id, group_name, name, price_delta_paise, sort_order)
       VALUES (?,?,?,?,?, (SELECT COALESCE(MAX(sort_order),0)+1 FROM menu_item_options WHERE menu_item_id = ?))`,
      [optionId, item.id, data.groupName, data.name, data.priceDeltaPaise, item.id],
    );
    res.status(201).json({ option: get('SELECT * FROM menu_item_options WHERE id = ?', [optionId]) });
  }),
);

// ---------------------------------------------------------------------------
// Local image storage (development-friendly). Returns a URL served from /uploads.
// ---------------------------------------------------------------------------
staffRouter.post(
  '/uploads/image',
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        filename: z.string().max(120).optional(),
        dataUrl: z.string().regex(/^data:image\/(png|jpe?g|webp|gif);base64,/),
      })
      .parse(req.body);
    const match = data.dataUrl.match(/^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/);
    if (!match) throw badRequest('Unsupported image format');
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 3 * 1024 * 1024) throw badRequest('Image must be under 3MB');
    const uploadsDir = path.join(SERVER_ROOT, 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = `${id()}.${ext}`;
    fs.writeFileSync(path.join(uploadsDir, fileName), buffer);
    res.status(201).json({ url: `/uploads/${fileName}` });
  }),
);
