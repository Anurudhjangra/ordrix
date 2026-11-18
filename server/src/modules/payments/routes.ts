import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { get, run } from '../../db/index.js';
import {
  assertOrderPayable,
  initiatePayment,
  markPaymentFailed,
  markPaymentVerified,
  paymentMode,
  recordWebhookEvent,
  verifyRazorpayPaymentSignature,
  verifyRazorpaySignature,
  getPaymentForOrder,
} from './service.js';
import { audit } from '../../lib/audit.js';
import { config } from '../../config.js';

export const paymentsRouter = Router();

/** Public config so the client knows whether it is in sandbox or live mode. */
paymentsRouter.get('/config', (_req, res) => {
  const mode = paymentMode();
  const liveRequested = config.payments.mode === 'razorpay';
  const liveReady = liveRequested && mode === 'razorpay';
  res.json({
    mode,
    liveRequested,
    liveReady,
    // Never expose the key secret. Key id is safe to share for checkout JS.
    razorpayKeyId: mode === 'razorpay' ? config.payments.razorpayKeyId : null,
    message:
      liveRequested && !liveReady
        ? 'Razorpay mode requested but keys are missing. Running in sandbox.'
        : mode === 'razorpay'
          ? 'Razorpay live checkout enabled.'
          : 'Sandbox mode: no real money is charged.',
  });
});

paymentsRouter.post(
  '/:orderId/create',
  requireAuth,
  asyncHandler(async (req, res) => {
    assertOrderPayable(req.params.orderId, req.user!.id, req.user!.role === 'admin');
    const result = await initiatePayment(req.params.orderId);
    res.json(result);
  }),
);

const verifySchema = z.object({
  providerPaymentId: z.string().max(120).optional(),
  razorpayOrderId: z.string().max(120).optional(),
  razorpayPaymentId: z.string().max(120).optional(),
  razorpaySignature: z.string().max(256).optional(),
  method: z.string().max(40).optional(),
  simulateFailure: z.boolean().optional(),
});

paymentsRouter.post(
  '/:orderId/verify',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    assertOrderPayable(orderId, req.user!.id, req.user!.role === 'admin');
    const data = verifySchema.parse(req.body ?? {});

    if (paymentMode() === 'sandbox') {
      if (data.simulateFailure) {
        markPaymentFailed(orderId, 'Sandbox simulated failure');
        return res.json({ status: 'failed' });
      }
      // Sandbox "success": the client signals completion; we simulate the
      // provider callback server-side and record a reference. No real money.
      const result = markPaymentVerified(orderId, {
        providerPaymentId: data.providerPaymentId ?? `sandbox_pay_${orderId.slice(0, 6)}`,
        method: data.method ?? 'sandbox',
        raw: { simulated: true, at: new Date().toISOString() },
        provider: 'sandbox',
      });
      audit({
        actorId: req.user!.id,
        action: 'payment.verify_sandbox',
        entityType: 'order',
        entityId: orderId,
        metadata: { alreadyVerified: result.alreadyVerified },
        ip: req.ip,
      });
      return res.json({ status: 'verified', alreadyVerified: result.alreadyVerified });
    }

    // Live Razorpay: verify the checkout signature server-side.
    if (!data.razorpayOrderId || !data.razorpayPaymentId || !data.razorpaySignature) {
      throw badRequest('Missing Razorpay payment fields');
    }
    const ok = verifyRazorpayPaymentSignature(
      data.razorpayOrderId,
      data.razorpayPaymentId,
      data.razorpaySignature,
    );
    if (!ok) throw badRequest('Payment signature verification failed');
    const result = markPaymentVerified(orderId, {
      providerPaymentId: data.razorpayPaymentId,
      method: data.method ?? null,
      provider: 'razorpay',
    });
    return res.json({ status: 'verified', alreadyVerified: result.alreadyVerified });
  }),
);

/**
 * Razorpay webhook receiver. Requires a valid signature over the raw body.
 * Duplicate events are ignored idempotently.
 */
paymentsRouter.post(
  '/webhook/razorpay',
  asyncHandler(async (req, res) => {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const rawBody =
      (req as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});
    if (!verifyRazorpaySignature(rawBody, signature)) {
      return res.status(400).json({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' } });
    }
    const event = req.body as {
      event?: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string; notes?: { orderId?: string }; method?: string } } };
    };
    const eventId = req.headers['x-razorpay-event-id'] as string | undefined ?? `${event.event}:${event.payload?.payment?.entity?.id ?? 'unknown'}`;
    const fresh = recordWebhookEvent('razorpay', eventId, event.event ?? 'unknown', event);
    if (!fresh) return res.json({ ok: true, duplicate: true });

    const entity = event.payload?.payment?.entity;
    const internalOrderId = entity?.notes?.orderId;
    if (internalOrderId && entity?.id) {
      if (['payment.captured', 'payment.authorized'].includes(event.event ?? '')) {
        markPaymentVerified(internalOrderId, {
          providerPaymentId: entity.id,
          method: entity.method ?? null,
          provider: 'razorpay',
          raw: event,
        });
      } else if (event.event === 'payment.failed') {
        markPaymentFailed(internalOrderId, 'Provider reported payment failure');
      }
    }
    res.json({ ok: true });
  }),
);

paymentsRouter.get(
  '/:orderId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = get<{ customer_id: string }>('SELECT customer_id FROM orders WHERE id = ?', [
      req.params.orderId,
    ]);
    if (!order) throw notFound('Order not found');
    if (order.customer_id !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'owner') {
      throw forbidden();
    }
    const payment = getPaymentForOrder(req.params.orderId);
    if (!payment) throw notFound('Payment not found');
    res.json({
      payment: {
        id: payment.id,
        orderId: payment.order_id,
        provider: payment.provider,
        amountPaise: payment.amount_paise,
        status: payment.status,
        method: payment.method,
        providerPaymentId: payment.provider_payment_id,
      },
    });
  }),
);

// Lightweight route to confirm the sandbox payment provider is reachable.
paymentsRouter.get('/health/provider', (_req, res) => {
  const count = get<{ c: number }>('SELECT COUNT(*) as c FROM payments');
  res.json({ mode: paymentMode(), paymentsRecorded: Number(count?.c ?? 0) });
});

// Keep a reference import used in webhook path typing without runtime cost.
void run;
