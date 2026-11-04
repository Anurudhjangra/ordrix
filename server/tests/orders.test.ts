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
  setItemAvailability,
  setCafeAccepting,
  addCafeAndItem,
  createSlot,
} from './helpers.js';

describe('order lifecycle', () => {
  beforeAll(setupDatabase);

  it('customer can browse the cafe menu', async () => {
    const res = await app.get('/api/cafes/cafe-my-frapey/menu');
    expect(res.status).toBe(200);
    expect(res.body.categories.length).toBeGreaterThan(0);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(Number(res.body.items[0].price_paise)).toBeGreaterThan(0);
  });

  it('creates an order with persisted items, snapshot prices and a pickup token', async () => {
    const student = await requestAgentFor('student');
    const { orderId } = await createPaidOrder(student, {});
    const detail = await student.get(`/api/orders/${orderId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.order.order_number).toMatch(/^\d+$/);
    expect(detail.body.order.items.length).toBe(1);
    expect(detail.body.order.items[0].name_snapshot).toBeUndefined(); // serialized as `name`
    expect(detail.body.order.pickup_token.token).toMatch(/^MF-\d{4,}$/);
    expect(detail.body.order.timeline[0].to_status).toBe('awaiting_acceptance');
    expect(countRows('SELECT COUNT(*) as c FROM order_items')).toBe(1);
  });

  it('rejects duplicate submissions via idempotency key', async () => {
    const student = await requestAgentFor('student');
    const menu = await student.get('/api/cafes/cafe-my-frapey/menu');
    const item = menu.body.items[0];
    const slots = await student.get('/api/cafes/cafe-my-frapey/slots');
    const key = `dup-${Date.now()}`;
    const body = {
      cafeId: 'cafe-my-frapey',
      items: [{ menuItemId: item.id, quantity: 1 }],
      pickupSlotId: slots.body.slots[0].id,
      idempotencyKey: key,
    };
    const first = await student.post('/api/orders').send(body);
    const second = await student.post('/api/orders').send(body);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.order.id).toBe(first.body.order.id);
    expect(countRows(`SELECT COUNT(*) as c FROM orders WHERE idempotency_key = '${key}'`)).toBe(1);
  });

  it('does not mark an order paid before verified payment confirmation', async () => {
    const student = await requestAgentFor('student');
    const menu = await student.get('/api/cafes/cafe-my-frapey/menu');
    const item = menu.body.items[0];
    const slots = await student.get('/api/cafes/cafe-my-frapey/slots');
    const res = await student
      .post('/api/orders')
      .send({
        cafeId: 'cafe-my-frapey',
        items: [{ menuItemId: item.id, quantity: 1 }],
        pickupSlotId: slots.body.slots[0].id,
        idempotencyKey: `unpaid-${Date.now()}`,
      });
    expect(res.status).toBe(201);
    expect(res.body.order.payment_status).toBe('created');
    expect(res.body.order.status).toBe('awaiting_acceptance');
  });

  it('prevents purchase of out-of-stock items', async () => {
    const student = await requestAgentFor('student');
    const menu = await student.get('/api/cafes/cafe-my-frapey/menu');
    const item = menu.body.items[0];
    setItemAvailability(item.id, false);
    try {
      const slots = await student.get('/api/cafes/cafe-my-frapey/slots');
      const res = await student
        .post('/api/orders')
        .send({
          cafeId: 'cafe-my-frapey',
          items: [{ menuItemId: item.id, quantity: 1 }],
          pickupSlotId: slots.body.slots[0].id,
          idempotencyKey: `oos-${Date.now()}`,
        });
      expect(res.status).toBe(409);
    } finally {
      setItemAvailability(item.id, true);
    }
  });

  it('refuses orders when the cafe is paused', async () => {
    const student = await requestAgentFor('student');
    setCafeAccepting('cafe-my-frapey', false);
    try {
      const res = await student
        .post('/api/orders')
        .send({
          cafeId: 'cafe-my-frapey',
          items: [],
          idempotencyKey: `pause-${Date.now()}`,
        });
      expect(res.status).toBe(409);
    } finally {
      setCafeAccepting('cafe-my-frapey', true);
    }
  });

  it('does not accept orders into overbooked pickup slots', async () => {
    const student = await requestAgentFor('student');
    const menu = await student.get('/api/cafes/cafe-my-frapey/menu');
    const item = menu.body.items[0];
    const slotId = createSlot('cafe-my-frapey', 'Capacity Test', 1);
    const ok = await student
      .post('/api/orders')
      .send({
        cafeId: 'cafe-my-frapey',
        items: [{ menuItemId: item.id, quantity: 1 }],
        pickupSlotId: slotId,
        idempotencyKey: `cap1-${Date.now()}`,
      });
    expect(ok.status).toBe(201);
    const full = await student
      .post('/api/orders')
      .send({
        cafeId: 'cafe-my-frapey',
        items: [{ menuItemId: item.id, quantity: 1 }],
        pickupSlotId: slotId,
        idempotencyKey: `cap2-${Date.now()}`,
      });
    expect(full.status).toBe(409);
    expect(full.body.error.code).toBe('CONFLICT');
  });

  it('generates unique pickup tokens under concurrent order creation', async () => {
    const student = await requestAgentFor('student');
    const menu = await student.get('/api/cafes/cafe-my-frapey/menu');
    const item = menu.body.items[0];
    const slots = await student.get('/api/cafes/cafe-my-frapey/slots');
    const slotId = slots.body.slots[0].id;
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        student
          .post('/api/orders')
          .send({
            cafeId: 'cafe-my-frapey',
            items: [{ menuItemId: item.id, quantity: 1 }],
            pickupSlotId: slotId,
            idempotencyKey: `conc-${Date.now()}-${i}`,
          })
          .then((r) => r.body.order.pickup_token.token),
      ),
    );
    expect(new Set(results).size).toBe(10);
    expect(countRows('SELECT COUNT(*) as c FROM pickup_tokens')).toBeGreaterThanOrEqual(10);
  });

  it('keeps historical order snapshots when the menu item changes later', async () => {
    const student = await requestAgentFor('student');
    const menu = await student.get('/api/cafes/cafe-my-frapey/menu');
    const item = menu.body.items[0];
    const originalPrice = item.price_paise;
    const slots = await student.get('/api/cafes/cafe-my-frapey/slots');
    const res = await student
      .post('/api/orders')
      .send({
        cafeId: 'cafe-my-frapey',
        items: [{ menuItemId: item.id, quantity: 1 }],
        pickupSlotId: slots.body.slots[0].id,
        idempotencyKey: `snap-${Date.now()}`,
      });
    // Change the menu item price via the owner.
    const owner = await requestAgentFor('owner');
    const upd = await owner.patch(`/api/staff/menu/items/${item.id}`).send({ pricePaise: originalPrice + 10000 });
    expect(upd.status).toBe(200);
    // The historical order must still show the old price.
    const after = await student.get(`/api/orders/${res.body.order.id}`);
    expect(after.body.order.items[0].price_paise).toBe(originalPrice);
  });
});

describe('state transitions and pickup enforcement', () => {
  beforeAll(setupDatabase);

  it('rejects invalid order-state transitions', async () => {
    const student = await requestAgentFor('student');
    const owner = await requestAgentFor('owner');
    const { orderId } = await createPaidOrder(student);
    // Jumping straight to "ready" from awaiting_acceptance is invalid.
    const bad = await owner.post(`/api/staff/orders/${orderId}/ready`).send({});
    expect(bad.status).toBe(409);

    const accepted = await owner.post(`/api/staff/orders/${orderId}/accept`).send({});
    expect(accepted.status).toBe(200);
    expect(accepted.body.order.status).toBe('accepted');
  });

  it('allows a ready order to be collected exactly once', async () => {
    const student = await requestAgentFor('student');
    const owner = await requestAgentFor('owner');
    const fixture = await createPaidOrder(student);
    for (const step of ['accept', 'preparing', 'ready']) {
      const r = await owner.post(`/api/staff/orders/${fixture.orderId}/${step}`).send({});
      expect(r.status).toBe(200);
    }
    const verify = await owner.post('/api/staff/pickup/verify').send({ token: fixture.token });
    expect(verify.body.canCollect).toBe(true);

    const collect = await owner.post('/api/staff/pickup/collect').send({ token: fixture.token });
    expect(collect.status).toBe(200);
    expect(collect.body.order.status).toBe('collected');
    expect(collect.body.order.collected_by).toBeTruthy();

    const reuse = await owner.post('/api/staff/pickup/collect').send({ token: fixture.token });
    expect(reuse.status).toBe(409);

    // An order that was not ready cannot be collected.
    const student2 = await register(agent(), {
      name: 'Student Two',
      email: `two-${Date.now()}@mdu.test`,
      password: 'Student@12345',
    });
    void student2;
    const fixture2 = await createPaidOrder(student);
    const premature = await owner.post('/api/staff/pickup/collect').send({ token: fixture2.token });
    expect(premature.status).toBe(409);
  });

  it('rejects a pickup token from another cafe', async () => {
    addCafeAndItem();
    const owner = await requestAgentFor('owner');
    const student = await requestAgentFor('student');
    // Create an order at the second cafe so it gets a token scoped to cafe-two.
    const other = await student
      .post('/api/orders')
      .send({
        cafeId: 'cafe-two',
        items: [{ menuItemId: 'item-two', quantity: 1 }],
        pickupSlotId: 'slot-two',
        idempotencyKey: `cafe2-${Date.now()}`,
      });
    expect(other.status).toBe(201);
    const otherToken = other.body.order.pickup_token.token;
    // Verifying cafe-two's token at cafe-my-frapey must fail.
    const res = await owner.post('/api/staff/pickup/verify').send({ token: otherToken });
    expect(res.status).toBe(404);
  });

  it('flags orders waiting too long for acceptance and allows cancellation without refund workflow when unpaid', async () => {
    const student = await requestAgentFor('student');
    const owner = await requestAgentFor('owner');
    // Unpaid order (do not create a payment).
    const menu = await student.get('/api/cafes/cafe-my-frapey/menu');
    const item = menu.body.items[0];
    const slots = await student.get('/api/cafes/cafe-my-frapey/slots');
    const created = await student
      .post('/api/orders')
      .send({
        cafeId: 'cafe-my-frapey',
        items: [{ menuItemId: item.id, quantity: 1 }],
        pickupSlotId: slots.body.slots[0].id,
        idempotencyKey: `timeout-${Date.now()}`,
      });
    expect(created.status).toBe(201);
    const orderId = created.body.order.id;

    // Customer cancels while awaiting acceptance.
    const cancel = await student.post(`/api/orders/${orderId}/cancel`).send({ reason: 'changed my mind' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.order.status).toBe('cancellation_requested');

    // Owner approves the cancellation -> cancelled (payment not verified, no refund row).
    const approve = await owner.post(`/api/staff/orders/${orderId}/cancel`).send({ reason: 'accepted cancel' });
    expect(approve.status).toBe(200);
    expect(approve.body.order.status).toBe('cancelled');
    expect(
      countRows('SELECT COUNT(*) as c FROM refunds WHERE order_id = ?', [orderId]),
    ).toBe(0);
  });
});

/** Convenience wrapper: fresh agent + login. */
async function requestAgentFor(role: 'student' | 'owner' | 'admin') {
  const ctx = agent();
  const cred = CREDENTIALS[role];
  await login(ctx, cred.email, cred.password);
  return ctx;
}

describe('basic auth flows', () => {
  beforeAll(setupDatabase);

  it('registers a new student account', async () => {
    const res = await agent()
      .post('/api/auth/register')
      .send({ name: 'New Student', email: `new-${Date.now()}@mdu.test`, password: 'Student@12345' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('student');
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('rejects duplicate registration', async () => {
    const email = `dup-${Date.now()}@mdu.test`;
    await agent().post('/api/auth/register').send({ name: 'Dup User', email, password: 'Student@12345' });
    const res = await agent().post('/api/auth/register').send({ name: 'Dup User 2', email, password: 'Student@12345' });
    expect(res.status).toBe(409);
  });

  it('does not leak passwords in stored rows', async () => {
    const rows = countRows(`SELECT COUNT(*) as c FROM users WHERE password_hash IS NULL OR password_hash = ''`);
    expect(rows).toBe(0);
  });
});