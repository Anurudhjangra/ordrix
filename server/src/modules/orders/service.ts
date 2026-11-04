import { all, get, run, tx } from '../../db/index.js';
import { id } from '../../lib/ids.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { computeCharges, getSettings } from '../../lib/settings.js';
import { allocateOrderNumber, allocatePickupToken } from '../../lib/pickup.js';
import { cafeStatus } from '../cafe/routes.js';
import { createNotification } from '../notifications/service.js';
import { bus, EVENTS } from '../../lib/bus.js';
import { istDateString } from '../../lib/time.js';

export type OrderStatus =
  | 'awaiting_acceptance'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'collected'
  | 'rejected'
  | 'cancellation_requested'
  | 'cancelled'
  | 'refund_pending'
  | 'refunded';

export type PaymentStatus =
  | 'created'
  | 'pending'
  | 'verified'
  | 'failed'
  | 'refund_initiated'
  | 'partially_refunded'
  | 'refunded';

export interface OrderRow {
  id: string;
  order_number: string;
  cafe_id: string;
  customer_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal_paise: number;
  tax_paise: number;
  fee_paise: number;
  total_paise: number;
  pickup_slot_id: string | null;
  pickup_window_label: string | null;
  customer_notes: string | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  ready_at: string | null;
collected_at: string | null;
  collected_by: string | null;
  collected_by_name: string | null;
  cancel_reason: string | null;
}

/** Statuses that staff may move an order to, keyed by current status. */
const STAFF_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  awaiting_acceptance: ['accepted', 'rejected', 'cancelled', 'cancellation_requested'],
  accepted: ['preparing', 'ready', 'cancelled', 'cancellation_requested'],
  preparing: ['ready', 'cancelled'],
  ready: ['collected', 'cancelled'],
  cancellation_requested: ['cancelled', 'accepted', 'preparing', 'ready'],
  rejected: ['refund_pending', 'refunded'],
  cancelled: ['refund_pending', 'refunded'],
  refund_pending: ['refunded'],
  collected: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (STAFF_TRANSITIONS[from] ?? []).includes(to);
}

export const ACTIVE_STATUSES: OrderStatus[] = [
  'awaiting_acceptance',
  'accepted',
  'preparing',
  'ready',
  'cancellation_requested',
];

export interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
  optionIds?: string[];
}

export interface CreateOrderInput {
  cafeId: string;
  items: CreateOrderItemInput[];
  pickupSlotId?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
}

export function createOrder(userId: string, input: CreateOrderInput): string {
  const orderId = tx(() => {
    const cafe = get<{ id: string; is_active: number; is_accepting_orders: number; pause_reason: string | null }>(
      'SELECT id, is_active, is_accepting_orders, pause_reason FROM cafes WHERE id = ?',
      [input.cafeId],
    );
    if (!cafe) throw notFound('Cafe not found');
    const status = cafeStatus(cafe);
    if (!status.acceptingOrders) {
      throw conflict(status.reason ?? 'The cafe is not accepting orders right now');
    }
    // Cart validation runs after the cafe availability check so a paused
    // cafe reports 409 rather than 400 for an empty cart.
    if (!input.items?.length) throw badRequest('Your cart is empty');
    // Idempotency: return the existing order rather than creating a duplicate.
    if (input.idempotencyKey) {
      const existing = get<{ id: string }>(
        'SELECT id FROM orders WHERE idempotency_key = ? AND customer_id = ?',
        [input.idempotencyKey, userId],
      );
      if (existing) return existing.id;
    }

    // Validate items & compute the authoritative subtotal.
    let subtotal = 0;
    const preparedItems: {
      menuItemId: string;
      name: string;
      price: number;
      quantity: number;
      options: { id: string; name: string; priceDelta: number }[];
      lineTotal: number;
    }[] = [];

    for (const line of input.items) {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0 || line.quantity > 50) {
        throw badRequest('Invalid item quantity');
      }
      const item = get<{
        id: string;
        name: string;
        price_paise: number;
        is_available: number;
        cafe_id: string;
      }>('SELECT id, name, price_paise, is_available, cafe_id FROM menu_items WHERE id = ?', [
        line.menuItemId,
      ]);
      if (!item || item.cafe_id !== input.cafeId) throw badRequest('A selected item is no longer on the menu');
      if (item.is_available !== 1) {
        throw conflict(`"${item.name}" is currently unavailable. Please remove it to continue.`);
      }

      const options: { id: string; name: string; priceDelta: number }[] = [];
      let unitPrice = item.price_paise;
      for (const optionId of line.optionIds ?? []) {
        const option = get<{
          id: string;
          name: string;
          price_delta_paise: number;
          is_available: number;
          menu_item_id: string;
        }>('SELECT id, name, price_delta_paise, is_available, menu_item_id FROM menu_item_options WHERE id = ?', [
          optionId,
        ]);
        if (!option || option.menu_item_id !== item.id || option.is_available !== 1) {
          throw badRequest(`An option for "${item.name}" is no longer available`);
        }
        options.push({ id: option.id, name: option.name, priceDelta: option.price_delta_paise });
        unitPrice += option.price_delta_paise;
      }

      const lineTotal = unitPrice * line.quantity;
      subtotal += lineTotal;
      preparedItems.push({
        menuItemId: item.id,
        name: item.name,
        price: unitPrice,
        quantity: line.quantity,
        options,
        lineTotal,
      });
    }

    const charges = computeCharges(subtotal);

    // Pickup slot validation & capacity.
    let pickupSlotId: string | null = null;
    let pickupWindowLabel: string | null = null;
    if (input.pickupSlotId) {
      const slot = get<{
        id: string;
        label: string;
        capacity: number;
        is_active: number;
        cafe_id: string;
      }>('SELECT id, label, capacity, is_active, cafe_id FROM pickup_slots WHERE id = ?', [
        input.pickupSlotId,
      ]);
      if (!slot || slot.cafe_id !== input.cafeId || slot.is_active !== 1) {
        throw badRequest('Selected pickup window is not available');
      }
      const placeholders = ACTIVE_STATUSES.map(() => '?').join(',');
      const booked = get<{ c: number }>(
        `SELECT COUNT(*) as c FROM orders WHERE pickup_slot_id = ? AND status IN (${placeholders})`,
        [slot.id, ...ACTIVE_STATUSES],
      );
      if (Number(booked?.c ?? 0) >= slot.capacity) {
        throw conflict('That pickup window just filled up. Please choose another window.');
      }
      pickupSlotId = slot.id;
      pickupWindowLabel = slot.label;
    }

    const orderNumber = allocateOrderNumber();
    const newOrderId = id();
    run(
      `INSERT INTO orders (id, order_number, cafe_id, customer_id, status, payment_status,
         subtotal_paise, tax_paise, fee_paise, total_paise, pickup_slot_id, pickup_window_label,
         customer_notes, idempotency_key)
       VALUES (?,?,?,?,'awaiting_acceptance','created',?,?,?,?,?,?,?,?)`,
      [
        newOrderId,
        orderNumber,
        input.cafeId,
        userId,
        charges.subtotalPaise,
        charges.taxPaise,
        charges.feePaise,
        charges.totalPaise,
        pickupSlotId,
        pickupWindowLabel,
        input.notes ?? null,
        input.idempotencyKey ?? null,
      ],
    );

    for (const line of preparedItems) {
      run(
        `INSERT INTO order_items (id, order_id, menu_item_id, name_snapshot, price_paise_snapshot,
           quantity, options_snapshot, line_total_paise)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          id(),
          newOrderId,
          line.menuItemId,
          line.name,
          line.price,
          line.quantity,
          line.options.length ? JSON.stringify(line.options) : null,
          line.lineTotal,
        ],
      );
    }

    run(
      `INSERT INTO order_status_history (id, order_id, from_status, to_status, changed_by, note)
       VALUES (?,?,?,?,?,?)`,
      [id(), newOrderId, null, 'awaiting_acceptance', userId, 'Order placed'],
    );

    run(
      `INSERT INTO payments (id, order_id, provider, amount_paise, status)
       VALUES (?,?,?,?,'created')`,
      [id(), newOrderId, 'sandbox', charges.totalPaise],
    );

    allocatePickupToken(input.cafeId, newOrderId);

    return newOrderId;
  });

  const detail = getOrderDetail(orderId)!;
  createNotification({
    userId,
    orderId,
    type: 'order_placed',
    title: `Order #${detail.order_number} placed`,
    body: `We sent your order to ${detail.cafe_name}. Your pickup token is ${detail.pickup_token?.token ?? 'pending'}.`,
  });
  try {
    bus.emit(EVENTS.ORDER_CREATED, { cafeId: input.cafeId, orderId });
    bus.emit(EVENTS.ORDER_UPDATED, { cafeId: input.cafeId, orderId });
  } catch {
    /* ignore */
  }
  return orderId;
}

export interface OrderDetail {
  id: string;
  order_number: string;
  cafe_id: string;
  cafe_name: string;
  customer_id: string;
  customer_name: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal_paise: number;
  tax_paise: number;
  fee_paise: number;
  total_paise: number;
  pickup_window_label: string | null;
  customer_notes: string | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  collected_at: string | null;
  collected_by: string | null;
  collected_by_name: string | null;
  cancel_reason: string | null;
  payment_provider: string | null;
  orders_ahead: number;
  queue_position: number;
  eta_minutes: number;
  estimated_ready_at: string | null;
  items: {
    id: string;
    name: string;
    price_paise: number;
    quantity: number;
    options: { id: string; name: string; priceDelta: number }[];
    line_total_paise: number;
  }[];
  timeline: {
    id: string;
    from_status: string | null;
    to_status: string;
    note: string | null;
    created_at: string;
  }[];
  pickup_token: { token: string; is_used: number; used_at: string | null } | null;
}

export function getOrderDetail(orderId: string): OrderDetail | undefined {
  const order = get<
    OrderRow & {
      cafe_name: string;
      customer_name: string;
      payment_provider: string | null;
      collected_by_name: string | null;
    }
  >(
    `SELECT o.*, c.name as cafe_name, u.name as customer_name, cb.name as collected_by_name,
       (SELECT provider FROM payments p WHERE p.order_id = o.id ORDER BY p.created_at LIMIT 1) as payment_provider
     FROM orders o
     JOIN cafes c ON c.id = o.cafe_id
     JOIN users u ON u.id = o.customer_id
     LEFT JOIN users cb ON cb.id = o.collected_by
     WHERE o.id = ?`,
    [orderId],
  );
  if (!order) return undefined;

  const items = all<{
    id: string;
    name_snapshot: string;
    price_paise_snapshot: number;
    quantity: number;
    options_snapshot: string | null;
    line_total_paise: number;
  }>('SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at', [orderId]).map((row) => ({
    id: row.id,
    name: row.name_snapshot,
    price_paise: row.price_paise_snapshot,
    quantity: row.quantity,
    options: row.options_snapshot
      ? (JSON.parse(row.options_snapshot) as { id: string; name: string; priceDelta: number }[])
      : [],
    line_total_paise: row.line_total_paise,
  }));

  const timeline = all<{
    id: string;
    from_status: string | null;
    to_status: string;
    note: string | null;
    created_at: string;
  }>(
    'SELECT id, from_status, to_status, note, created_at FROM order_status_history WHERE order_id = ? ORDER BY created_at, rowid',
    [orderId],
  );

  const token = get<{ token: string; is_used: number; used_at: string | null }>(
    'SELECT token, is_used, used_at FROM pickup_tokens WHERE order_id = ?',
    [orderId],
  );

  // Live queue position + ETA. Only meaningful while the order is still being
  // worked on; once ready/collected (or terminated) it resets to zero.
  const QUEUE_STATUSES: OrderStatus[] = ['awaiting_acceptance', 'accepted', 'preparing'];
  let ordersAhead = 0;
  let etaMinutes = 0;
  if (QUEUE_STATUSES.includes(order.status)) {
    const ahead = get<{ c: number }>(
      `SELECT COUNT(*) as c FROM orders
       WHERE cafe_id = ?
         AND status IN (?,?,?)
         AND created_at >= datetime('now','-12 hours')
         AND (created_at < ? OR (created_at = ? AND rowid < (SELECT rowid FROM orders WHERE id = ?)))`,
      [order.cafe_id, ...QUEUE_STATUSES, order.created_at, order.created_at, orderId],
    );
    ordersAhead = Number(ahead?.c ?? 0);

    // Prep time is read from the live menu when the item still exists; older
    // orders (whose menu rows were reseeded) fall back to a sensible default.
    const prep = get<{ p: number | null }>(
      `SELECT MAX(m.prep_minutes) as p
       FROM order_items oi JOIN menu_items m ON m.id = oi.menu_item_id
       WHERE oi.order_id = ?`,
      [orderId],
    );
    const basePrep = Number(prep?.p ?? 0) || 6;

    // The cafe works through orders roughly in sequence; each queued order ahead
    // adds a small steady-serving delay on top of this order's own prep time.
    // Subtract the time already spent so the estimate counts down as work happens.
    const anchor = order.accepted_at ?? order.created_at;
    const anchorMs = Date.parse(`${anchor.replace(' ', 'T')}Z`);
    const elapsedMin = Number.isFinite(anchorMs) ? Math.max(0, (Date.now() - anchorMs) / 60_000) : 0;
    etaMinutes = Math.min(45, Math.max(1, Math.round(basePrep + ordersAhead * 2 - elapsedMin)));
  }
  const estimatedReadyAt =
    etaMinutes > 0 ? new Date(Date.now() + etaMinutes * 60_000).toISOString() : null;

  return {
    id: order.id,
    order_number: order.order_number,
    cafe_id: order.cafe_id,
    cafe_name: order.cafe_name,
    customer_id: order.customer_id,
    customer_name: order.customer_name,
    status: order.status,
    payment_status: order.payment_status,
    subtotal_paise: order.subtotal_paise,
    tax_paise: order.tax_paise,
    fee_paise: order.fee_paise,
    total_paise: order.total_paise,
    pickup_window_label: order.pickup_window_label,
    customer_notes: order.customer_notes,
    created_at: order.created_at,
    updated_at: order.updated_at,
    accepted_at: order.accepted_at,
    ready_at: order.ready_at,
    collected_at: order.collected_at,
    collected_by: order.collected_by,
    collected_by_name: order.collected_by_name,
    cancel_reason: order.cancel_reason,
    payment_provider: order.payment_provider,
    orders_ahead: ordersAhead,
    queue_position: QUEUE_STATUSES.includes(order.status) ? ordersAhead + 1 : 0,
    eta_minutes: etaMinutes,
    estimated_ready_at: estimatedReadyAt,
    items,
    timeline,
    pickup_token: token ?? null,
  };
}

export function listOrdersForCustomer(customerId: string): OrderDetail[] {
  const rows = all<{ id: string }>(
    'SELECT id FROM orders WHERE customer_id = ? ORDER BY created_at DESC',
    [customerId],
  );
  return rows.map((r) => getOrderDetail(r.id)!).filter(Boolean);
}

/** Update order status with validation, history, notifications, and refund handling. */
export function updateOrderStatus(
  orderId: string,
  to: OrderStatus,
  actorId: string,
  note?: string | null,
  opts: { reason?: string | null } = {},
): OrderDetail {
  const order = get<OrderRow>('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) throw notFound('Order not found');
  if (order.status === to) return getOrderDetail(orderId)!;
  if (!canTransition(order.status, to)) {
    throw conflict(`Cannot change an order from "${order.status}" to "${to}"`);
  }

  tx(() => {
    const fields: Record<string, string | null> = { status: to };
    const sets = ['status = ?', "updated_at = datetime('now')"];
    const params: unknown[] = [to];

    if (to === 'accepted' && !order.accepted_at) {
      sets.push("accepted_at = datetime('now')");
    }
    if (to === 'ready' && !order.ready_at) {
      sets.push("ready_at = datetime('now')");
    }
    if (to === 'collected') {
      sets.push("collected_at = datetime('now')", 'collected_by = ?');
      params.push(actorId);
      // Mark the pickup token as used (single-use enforcement).
      run(
        `UPDATE pickup_tokens SET is_used = 1, used_at = datetime('now'), used_by = ?
         WHERE order_id = ? AND is_used = 0`,
        [actorId, orderId],
      );
    }
    if (['rejected', 'cancelled', 'refund_pending'].includes(to)) {
      sets.push("cancelled_at = COALESCE(cancelled_at, datetime('now'))");
      if (opts.reason) {
        sets.push('cancel_reason = ?');
        params.push(opts.reason);
      }
    }
    params.push(orderId);
    run(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, params);

    run(
      `INSERT INTO order_status_history (id, order_id, from_status, to_status, changed_by, note)
       VALUES (?,?,?,?,?,?)`,
      [id(), orderId, order.status, to, actorId, note ?? null],
    );

    // Enter refund workflow when a paid order is rejected/cancelled.
    if (
      (to === 'rejected' || to === 'cancelled') &&
      order.payment_status === 'verified'
    ) {
      run(`UPDATE orders SET status = 'refund_pending', payment_status = 'refund_initiated' WHERE id = ?`, [orderId]);
      run(
        `INSERT INTO order_status_history (id, order_id, from_status, to_status, changed_by, note)
         VALUES (?,?,?,?,?,?)`,
        [id(), orderId, to, 'refund_pending', actorId, 'Payment captured; refund required'],
      );
      run(`UPDATE payments SET status = 'refund_initiated', updated_at = datetime('now') WHERE order_id = ?`, [
        orderId,
      ]);
      run(
        `INSERT INTO refunds (id, order_id, payment_id, amount_paise, status, reason)
         VALUES (?,?, (SELECT id FROM payments WHERE order_id = ? ORDER BY created_at LIMIT 1), ?, 'initiated', ?)`,
        [id(), orderId, orderId, order.total_paise, opts.reason ?? 'Order rejected/cancelled'],
      );
    }
  });

  const detail = getOrderDetail(orderId)!;
  const messages: Partial<Record<OrderStatus, string>> = {
    accepted: 'Your order was accepted by the cafe.',
    preparing: 'The cafe has started preparing your order.',
    ready: 'Your order is ready for pickup!',
    collected: 'Your order was collected. Enjoy!',
    rejected: 'The cafe could not accept your order.',
    cancelled: 'Your order was cancelled.',
    cancellation_requested: 'Your cancellation request was sent to the cafe.',
    refund_pending: 'A refund is being processed for your order.',
    refunded: 'Your refund has been completed.',
  };
  if (messages[to]) {
    createNotification({
      userId: detail.customer_id,
      orderId,
      type: `order_${to}`,
      title: messages[to]!,
      body: `Order #${detail.order_number} Â· ${detail.pickup_token?.token ?? ''}`.trim(),
    });
  }
  try {
    bus.emit(EVENTS.ORDER_UPDATED, { cafeId: detail.cafe_id, orderId });
  } catch {
    /* ignore */
  }
  return detail;
}

/** Customer-initiated cancellation request (policy: only before preparation). */
export function requestCancellation(orderId: string, customerId: string, reason?: string | null): OrderDetail {
  const order = get<OrderRow>('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) throw notFound('Order not found');
  if (order.customer_id !== customerId) throw forbidden();
  if (!['awaiting_acceptance', 'accepted'].includes(order.status)) {
    throw conflict('This order can no longer be cancelled online. Please contact the cafe.');
  }
  return updateOrderStatus(orderId, 'cancellation_requested', customerId, reason ?? 'Customer requested cancellation');
}

/** Mark a refund as processed (owner/admin). Reflects verified provider status. */
export function completeRefund(orderId: string, actorId: string, providerRefundId?: string): OrderDetail {
  const order = get<OrderRow>('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) throw notFound('Order not found');
  if (!['refund_pending', 'rejected', 'cancelled'].includes(order.status)) {
    throw conflict('This order is not awaiting a refund');
  }
  tx(() => {
    run(`UPDATE orders SET status = 'refunded', payment_status = 'refunded', updated_at = datetime('now') WHERE id = ?`, [
      orderId,
    ]);
    run(`UPDATE payments SET status = 'refunded', updated_at = datetime('now') WHERE order_id = ?`, [orderId]);
    run(
      `UPDATE refunds SET status = 'processed', provider_refund_id = COALESCE(?, provider_refund_id), updated_at = datetime('now')
       WHERE order_id = ?`,
      [providerRefundId ?? null, orderId],
    );
    run(
      `INSERT INTO order_status_history (id, order_id, from_status, to_status, changed_by, note)
       VALUES (?,?,?,?,?,?)`,
      [id(), orderId, order.status, 'refunded', actorId, 'Refund confirmed'],
    );
  });
  const detail = getOrderDetail(orderId)!;
  createNotification({
    userId: detail.customer_id,
    orderId,
    type: 'order_refunded',
    title: 'Your refund has been completed',
    body: `Order #${detail.order_number} refunded.`,
  });
  try {
    bus.emit(EVENTS.ORDER_UPDATED, { cafeId: detail.cafe_id, orderId });
  } catch {
    /* ignore */
  }
  return detail;
}

/** Flag orders that have sat in awaiting_acceptance beyond the timeout. */
export function flagTimedOutOrders(): number {
  const minutes = getSettings().orderAcceptTimeoutMinutes;
  const cutoffRows = all<{ id: string; cafe_id: string; customer_id: string; order_number: string }>(
    `SELECT id, cafe_id, customer_id, order_number FROM orders
     WHERE status = 'awaiting_acceptance'
       AND timeout_flagged_at IS NULL
       AND datetime(created_at, '+' || ? || ' minutes') <= datetime('now')`,
    [minutes],
  );
  for (const row of cutoffRows) {
    run("UPDATE orders SET timeout_flagged_at = datetime('now') WHERE id = ?", [row.id]);
    createNotification({
      userId: row.customer_id,
      orderId: row.id,
      type: 'order_accept_timeout',
      title: 'The cafe has not accepted your order yet',
      body: `Order #${row.order_number} is still awaiting acceptance. You can cancel it for a refund or wait.`,
    });
  }
  return cutoffRows.length;
}

export { istDateString };
