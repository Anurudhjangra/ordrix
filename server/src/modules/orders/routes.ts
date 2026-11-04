import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { forbidden, notFound } from '../../lib/errors.js';
import { get } from '../../db/index.js';
import {
  createOrder,
  getOrderDetail,
  listOrdersForCustomer,
  requestCancellation,
  type OrderDetail,
} from './service.js';
import { audit } from '../../lib/audit.js';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

const createSchema = z.object({
  cafeId: z.string().min(1),
  items: z.array(
    z.object({
      menuItemId: z.string().min(1),
      quantity: z.number().int().min(1).max(50),
      optionIds: z.array(z.string()).optional(),
    }),
  ),
  pickupSlotId: z.string().nullable().optional(),
  notes: z.string().max(300).nullable().optional(),
  idempotencyKey: z.string().min(8).max(100).nullable().optional(),
});

/** Can this user view this order? Owner of the order, or staff/owner of its cafe, or admin. */
export function canViewOrder(
  user: { id: string; role: string },
  order: OrderDetail,
): boolean {
  if (user.role === 'admin') return true;
  if (order.customer_id === user.id) return true;
  if (user.role === 'owner' || user.role === 'staff') {
    const member = get('SELECT id FROM cafe_members WHERE cafe_id = ? AND user_id = ?', [
      order.cafe_id,
      user.id,
    ]);
    return Boolean(member);
  }
  return false;
}

ordersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const orderId = createOrder(req.user!.id, data);
    audit({
      actorId: req.user!.id,
      action: 'order.create',
      entityType: 'order',
      entityId: orderId,
      ip: req.ip,
    });
    res.status(201).json({ order: getOrderDetail(orderId) });
  }),
);

ordersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ orders: listOrdersForCustomer(req.user!.id) });
  }),
);

ordersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = getOrderDetail(req.params.id);
    if (!order) throw notFound('Order not found');
    if (!canViewOrder(req.user!, order)) throw forbidden();
    res.json({ order });
  }),
);

const cancelSchema = z.object({ reason: z.string().max(300).optional() });

ordersRouter.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const data = cancelSchema.parse(req.body ?? {});
    const order = requestCancellation(req.params.id, req.user!.id, data.reason);
    audit({
      actorId: req.user!.id,
      action: 'order.cancel_request',
      entityType: 'order',
      entityId: order.id,
      ip: req.ip,
    });
    res.json({ order });
  }),
);
