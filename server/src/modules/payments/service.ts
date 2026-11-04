import crypto from 'node:crypto';
import { get, run, tx } from '../../db/index.js';
import { config } from '../../config.js';
import { id } from '../../lib/ids.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { createNotification } from '../notifications/service.js';
import { bus, EVENTS } from '../../lib/bus.js';

export interface PaymentRow {
  id: string;
  order_id: string;
  provider: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  amount_paise: number;
  status: string;
  method: string | null;
}

export function getPaymentForOrder(orderId: string): PaymentRow | undefined {
  return get<PaymentRow>('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at LIMIT 1', [
    orderId,
  ]);
}

/** True only when live mode is requested AND both Razorpay keys are present. */
function razorpayConfigured(): boolean {
  return (
    config.payments.mode === 'razorpay' &&
    Boolean(config.payments.razorpayKeyId) &&
    Boolean(config.payments.razorpayKeySecret)
  );
}

/**
 * The effective payment mode. Falls back to `sandbox` when live mode is
 * requested but the merchant keys are missing, so the app never blocks on an
 * incomplete configuration (no real money moves in sandbox).
 */
export function paymentMode(): 'sandbox' | 'razorpay' {
  return razorpayConfigured() ? 'razorpay' : 'sandbox';
}

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
}

/** Create an order on Razorpay (Orders API) and return the provider order id. */
async function createRazorpayOrder(
  amountPaise: number,
  receipt: string,
  notes: Record<string, string>,
): Promise<RazorpayOrderResponse> {
  const auth = Buffer.from(
    `${config.payments.razorpayKeyId}:${config.payments.razorpayKeySecret}`,
  ).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes }),
  });
  const data = (await response.json()) as {
    id?: string;
    amount?: number;
    currency?: string;
    error?: { description?: string };
  };
  if (!response.ok || !data.id) {
    throw new Error(data.error?.description ?? `Razorpay order creation failed (HTTP ${response.status})`);
  }
  return { id: data.id, amount: data.amount ?? amountPaise, currency: data.currency ?? 'INR' };
}

/**
 * Initiate a payment.
 * - sandbox: returns a locally generated pseudo payment id (no real money moves).
 * - razorpay: creates a real order via the Razorpay Orders API and returns the
 *   checkout parameters the client needs to open Razorpay Checkout.
 */
export async function initiatePayment(orderId: string) {
  const payment = getPaymentForOrder(orderId);
  if (!payment) throw notFound('Payment not found for order');
  const order = get<{ total_paise: number; status: string; payment_status: string; order_number: string }>(
    'SELECT total_paise, status, payment_status, order_number FROM orders WHERE id = ?',
    [orderId],
  );
  if (!order) throw notFound('Order not found');
  if (payment.status === 'verified') {
    return { mode: paymentMode(), alreadyPaid: true, amount_paise: payment.amount_paise };
  }
  if (['rejected', 'cancelled', 'refunded', 'refund_pending'].includes(order.status)) {
    throw conflict('This order can no longer be paid');
  }

  if (paymentMode() === 'sandbox') {
    const providerOrderId = `sandbox_order_${id().slice(0, 8)}`;
    run(
      `UPDATE payments SET provider = 'sandbox', provider_order_id = ?, status = 'pending', updated_at = datetime('now')
       WHERE id = ?`,
      [providerOrderId, payment.id],
    );
    run(`UPDATE orders SET payment_status = 'pending', updated_at = datetime('now') WHERE id = ?`, [orderId]);
    return {
      mode: 'sandbox' as const,
      orderId,
      amountPaise: payment.amount_paise,
      providerOrderId,
      // In sandbox the client should call /verify with this reference to simulate success.
      sandboxNote: 'Sandbox mode: no real money is charged. Call verify to simulate success.',
    };
  }

  // Live Razorpay: create the order server-side and return checkout parameters.
  let razorpayOrder: RazorpayOrderResponse;
  try {
    razorpayOrder = await createRazorpayOrder(payment.amount_paise, order.order_number, {
      orderId,
    });
  } catch (err) {
    throw conflict(
      `Razorpay error: ${err instanceof Error ? err.message : 'could not create payment order'}`,
    );
  }
  run(
    `UPDATE payments SET provider = 'razorpay', provider_order_id = ?, status = 'pending', updated_at = datetime('now')
     WHERE id = ?`,
    [razorpayOrder.id, payment.id],
  );
  run(`UPDATE orders SET payment_status = 'pending', updated_at = datetime('now') WHERE id = ?`, [orderId]);
  return {
    mode: 'razorpay' as const,
    orderId,
    amountPaise: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    razorpayOrderId: razorpayOrder.id,
    razorpayKeyId: config.payments.razorpayKeyId,
  };
}

/**
 * Mark a payment verified. Idempotent: repeating with the same provider payment
 * id will not double-verify or create duplicate state. Only ever called after a
 * server-side check (sandbox simulation or verified webhook/signature).
 */
export function markPaymentVerified(
  orderId: string,
  opts: { providerPaymentId?: string | null; method?: string | null; raw?: unknown; provider?: string },
): { orderId: string; alreadyVerified: boolean } {
  let alreadyVerified = false;
  tx(() => {
    const payment = getPaymentForOrder(orderId);
    if (!payment) throw notFound('Payment not found for order');
    if (payment.status === 'verified' || payment.status === 'refunded' || payment.status === 'refund_initiated') {
      alreadyVerified = true;
      return;
    }
    run(
      `UPDATE payments SET status = 'verified', provider = ?, provider_payment_id = COALESCE(?, provider_payment_id),
         method = ?, raw_json = ?, updated_at = datetime('now') WHERE id = ?`,
      [
        opts.provider ?? payment.provider,
        opts.providerPaymentId ?? null,
        opts.method ?? null,
        opts.raw ? JSON.stringify(opts.raw) : null,
        payment.id,
      ],
    );
    run(`UPDATE orders SET payment_status = 'verified', updated_at = datetime('now') WHERE id = ?`, [orderId]);
  });

  if (!alreadyVerified) {
    const detail = get<{ customer_id: string; order_number: string; cafe_id: string }>(
      'SELECT customer_id, order_number, cafe_id FROM orders WHERE id = ?',
      [orderId],
    );
    if (detail) {
      createNotification({
        userId: detail.customer_id,
        orderId,
        type: 'payment_verified',
        title: 'Payment confirmed',
        body: `Payment for order #${detail.order_number} was verified.`,
      });
      try {
        bus.emit(EVENTS.ORDER_UPDATED, { cafeId: detail.cafe_id, orderId });
      } catch {
        /* ignore */
      }
    }
  }
  return { orderId, alreadyVerified };
}

export function markPaymentFailed(orderId: string, reason?: string): void {
  const payment = getPaymentForOrder(orderId);
  if (!payment || payment.status === 'verified') return;
  run(`UPDATE payments SET status = 'failed', raw_json = ?, updated_at = datetime('now') WHERE id = ?`, [
    reason ? JSON.stringify({ reason }) : null,
    payment.id,
  ]);
  run(`UPDATE orders SET payment_status = 'failed', updated_at = datetime('now') WHERE id = ?`, [orderId]);
}

/** Verify a Razorpay webhook signature using the configured webhook secret. */
export function verifyRazorpaySignature(rawBody: string, signature: string | undefined): boolean {
  if (!signature || !config.payments.razorpayWebhookSecret) return false;
  const expected = crypto
    .createHmac('sha256', config.payments.razorpayWebhookSecret)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Verify a Razorpay checkout payment signature (order_id|payment_id). */
export function verifyRazorpayPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): boolean {
  if (!config.payments.razorpayKeySecret) return false;
  const expected = crypto
    .createHmac('sha256', config.payments.razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Insert a webhook event idempotently. Returns false when already processed. */
export function recordWebhookEvent(
  provider: string,
  eventId: string,
  eventType: string,
  payload: unknown,
): boolean {
  try {
    run(
      `INSERT INTO webhook_events (id, provider, event_id, event_type, payload) VALUES (?,?,?,?,?)`,
      [id(), provider, eventId, eventType, JSON.stringify(payload)],
    );
    return true;
  } catch {
    return false; // UNIQUE(provider, event_id) conflict = duplicate
  }
}

export function assertOrderPayable(orderId: string, userId: string, isAdmin: boolean): void {
  const order = get<{ customer_id: string; status: string; id: string }>(
    'SELECT customer_id, status, id FROM orders WHERE id = ?',
    [orderId],
  );
  if (!order) throw notFound('Order not found');
  if (!isAdmin && order.customer_id !== userId) throw badRequest('You cannot pay for this order');
}
