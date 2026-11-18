import crypto from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  app,
  agent,
  setupDatabase,
  login,
  register,
  CREDENTIALS,
  createPaidOrder,
  countRows,
} from './helpers.js';
import { get } from '../src/db/index.js';

async function agentFor(role: 'student' | 'owner' | 'admin') {
  const ctx = agent();
  const cred = CREDENTIALS[role];
  await login(ctx, cred.email, cred.password);
  return ctx;
}

function signedWebhook(body: object | string) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const sig = crypto.createHmac('sha256', 'test-webhook-secret').update(raw).digest('hex');
  return { raw, sig };
}

describe('payments', () => {
  beforeAll(setupDatabase);

  it('exposes payment mode without leaking secrets', async () => {
    const res = await app.get('/api/payments/config');
    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('sandbox');
    expect(JSON.stringify(res.body)).not.toContain('secret');
    expect(JSON.stringify(res.body)).not.toContain('test-webhook-secret');
  });

  it('verifies payment only after a server-side confirmation', async () => {
    const student = await agentFor('student');
    const fixture = await createPaidOrder(student);
    const after = await student.get(`/api/orders/${fixture.orderId}`);
    expect(after.body.order.payment_status).toBe('verified');
  });

  it('is idempotent under duplicate verification calls', async () => {
    const student = await agentFor('student');
    const fixture = await createPaidOrder(student);
    const again = await student
      .post(`/api/payments/${fixture.orderId}/verify`)
      .send({ method: 'sandbox' });
    expect(again.status).toBe(200);
    expect(again.body.alreadyVerified).toBe(true);
    expect(countRows('SELECT COUNT(*) as c FROM payments WHERE order_id = ?', [fixture.orderId])).toBe(1);
  });

  it('rejects webhooks without a valid signature', async () => {
    const res = await app
      .post('/api/payments/webhook/razorpay')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ event: 'payment.captured', payload: {} }));
    expect(res.status).toBe(400);
  });

  it('processes signed webhooks and ignores duplicates', async () => {
    const student = await agentFor('student');
    const menu = await student.get('/api/cafes/ordrix/menu');
    const item = menu.body.items[0];
    const slots = await student.get('/api/cafes/ordrix/slots');
    const created = await student
      .post('/api/orders')
      .send({
        cafeId: 'ordrix',
        items: [{ menuItemId: item.id, quantity: 1 }],
        pickupSlotId: slots.body.slots[0].id,
        idempotencyKey: `webhook-${Date.now()}`,
      });
    const orderId = created.body.order.id;

    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: { id: 'pay_verify_1', order_id: 'order_webhook_1', notes: { orderId }, method: 'upi' },
        },
      },
    });
    const sig = crypto.createHmac('sha256', 'test-webhook-secret').update(payload).digest('hex');

    const first = await app
      .post('/api/payments/webhook/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', sig)
      .send(payload);
    expect(first.status).toBe(200);
    expect(first.body.duplicate).toBeFalsy();

    const orderAfter = get<{ payment_status: string }>(
      'SELECT payment_status FROM orders WHERE id = ?',
      [orderId],
    );
    expect(orderAfter?.payment_status).toBe('verified');

    // Duplicate event (same signature, same event id) is processed once.
    const second = await app
      .post('/api/payments/webhook/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', sig)
      .send(payload);
    expect(second.status).toBe(200);
    expect(second.body.duplicate).toBe(true);
    expect(countRows('SELECT COUNT(*) as c FROM webhook_events')).toBe(1);
  });

  it('keeps a rejected paid order on the refund path until the refund is processed', async () => {
    const student = await agentFor('student');
    const owner = await agentFor('owner');
    const fixture = await createPaidOrder(student);

    const rejected = await owner.post(`/api/staff/orders/${fixture.orderId}/reject`).send({
      reason: 'Out of stock',
    });
    expect(rejected.status).toBe(200);
    expect(rejected.body.order.status).toBe('refund_pending');
    expect(rejected.body.order.payment_status).toBe('refund_initiated');
    expect(countRows('SELECT COUNT(*) as c FROM refunds WHERE order_id = ?', [fixture.orderId])).toBe(1);

    const done = await owner.post(`/api/staff/orders/${fixture.orderId}/refund`).send({
      providerRefundId: 'rzp_refund_1',
    });
    expect(done.status).toBe(200);
    expect(done.body.order.status).toBe('refunded');
    expect(done.body.order.payment_status).toBe('refunded');

    // Refund cannot be completed twice.
    const duplicate = await owner.post(`/api/staff/orders/${fixture.orderId}/refund`).send({});
    expect(duplicate.status).toBe(409);

    const refundRow = get<{ status: string; provider_refund_id: string | null }>(
      'SELECT status, provider_refund_id FROM refunds WHERE order_id = ?',
      [fixture.orderId],
    );
    expect(refundRow?.status).toBe('processed');
    expect(refundRow?.provider_refund_id).toBe('rzp_refund_1');
  });

  it('supports sandbox simulated failures without marking paid', async () => {
    const student = await agentFor('student');
    const menu = await student.get('/api/cafes/ordrix/menu');
    const item = menu.body.items[0];
    const slots = await student.get('/api/cafes/ordrix/slots');
    const created = await student
      .post('/api/orders')
      .send({
        cafeId: 'ordrix',
        items: [{ menuItemId: item.id, quantity: 1 }],
        pickupSlotId: slots.body.slots[0].id,
        idempotencyKey: `fail-${Date.now()}`,
      });
    const orderId = created.body.order.id;
    await student.post(`/api/payments/${orderId}/create`).send({});
    const failed = await student
      .post(`/api/payments/${orderId}/verify`)
      .send({ simulateFailure: true });
    expect(failed.body.status).toBe('failed');
    const order = get<{ payment_status: string }>('SELECT payment_status FROM orders WHERE id = ?', [orderId]);
    expect(order?.payment_status).toBe('failed');
  });

  it('rejects direct tampering of payment status from the client', async () => {
    const student = await agentFor('student');
    const fixture = await createPaidOrder(student);
    // There is no API to force "paid"; the client can only verify via server flow.
    const res = await student.patch(`/api/orders/${fixture.orderId}`).send({ payment_status: 'verified' });
    expect(res.status).toBe(404);
  });
});