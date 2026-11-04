import request from 'supertest';
import { createApp } from '../src/app.js';
import { runMigrations } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';
import { tx, run, get } from '../src/db/index.js';
import { config } from '../src/config.js';

export const server = createApp();
export const app = request(server);

/** Fresh agent that keeps its own cookie jar. */
export function agent() {
  return request.agent(server);
}

export function setupDatabase(): void {
  runMigrations();
  seed();
}

export function seedAgent(email: string, password: string) {
  return request.agent(server);
}

export async function login(agent: any, email: string, password: string) {
  const res = await agent.post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.user;
}

export async function register(
  agent: any,
  opts: { name: string; email: string; password: string },
) {
  const res = await agent.post('/api/auth/register').send(opts);
  if (res.status !== 201) throw new Error(`register failed: ${res.status}`);
  return res.body.user;
}

export const CREDENTIALS = {
  owner: { email: config.seed.ownerEmail, password: config.seed.ownerPassword },
  admin: { email: config.seed.adminEmail, password: config.seed.adminPassword },
  student: { email: config.seed.studentEmail, password: config.seed.studentPassword },
};

export interface OrderFixture {
  orderId: string;
  orderNumber: string;
  token: string;
  itemId: string;
  slotId: string;
}

/** Fetch the menu, pick a slot and an item, and create + pay an order. */
export async function createPaidOrder(
  agent: any,
  override: Partial<{ quantity: number; items: unknown[]; slotId: string }> = {},
): Promise<OrderFixture> {
  const menu = await agent.get('/api/cafes/cafe-my-frapey/menu');
  const item = (menu.body.items as { id: string; name: string }[])[0];
  const slots = await agent.get('/api/cafes/cafe-my-frapey/slots');
  const slot = (slots.body.slots as { id: string; remaining: number }[])[0];
  const items = override.items ?? [{ menuItemId: item.id, quantity: override.quantity ?? 1 }];
  const res = await agent
    .post('/api/orders')
    .send({
      cafeId: 'cafe-my-frapey',
      items,
      pickupSlotId: override.slotId ?? slot.id,
      idempotencyKey: `test-${Math.random().toString(36).slice(2)}${Date.now()}`,
    });
  if (res.status !== 201) throw new Error(`create order failed: ${res.status} ${JSON.stringify(res.body)}`);
  const order = res.body.order;
  const pay = await agent.post(`/api/payments/${order.id}/create`).send({});
  if (pay.status !== 200) throw new Error('payment create failed');
  const ver = await agent.post(`/api/payments/${order.id}/verify`).send({ method: 'sandbox' });
  if (ver.status !== 200) throw new Error('payment verify failed');
  return {
    orderId: order.id,
    orderNumber: order.order_number,
    token: order.pickup_token.token,
    itemId: item.id,
    slotId: slot.id,
  };
}

/** Insert a brand-new cafe with a single item, bypassing HTTP (no onboarding API yet). */
export function addCafeAndItem() {
  tx(() => {
    run(
      `INSERT INTO cafes (id, name, slug, tagline, description, is_active, is_accepting_orders)
       VALUES (?,?,?,?,?,?,?)`,
      ['cafe-two', 'Cafe Two', 'cafe-two', 'Second test cafe', null, 1, 1],
    );
    run(
      `INSERT INTO menu_categories (id, cafe_id, name, sort_order) VALUES (?,?,?,0)`,
      ['cat-two', 'cafe-two', 'Drinks'],
    );
    run(
      `INSERT INTO menu_items (id, cafe_id, category_id, name, description, price_paise, is_veg, is_available, prep_minutes)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      ['item-two', 'cafe-two', 'cat-two', 'Second Cafe Latte', null, 12000, 1, 1, 5],
    );
    run(
      `INSERT INTO pickup_slots (id, cafe_id, label, start_time, end_time, capacity, is_active, sort_order)
       VALUES (?,?,?,?,?,?,1,0)`,
      ['slot-two', 'cafe-two', 'Lunch', '13:00', '14:00', 20],
    );
  });
}

export function setSlotCapacity(slotId: string, capacity: number): void {
  run('UPDATE pickup_slots SET capacity = ? WHERE id = ?', [capacity, slotId]);
}

/** Insert a fresh pickup slot with no prior orders (ideal for capacity tests). */
export function createSlot(cafeId: string, label: string, capacity: number, start = '13:00', end = '14:15'): string {
  const slotId = `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  run(
    `INSERT INTO pickup_slots (id, cafe_id, label, start_time, end_time, capacity, is_active, sort_order)
     VALUES (?,?,?,?,?,?,1,99)`,
    [slotId, cafeId, label, start, end, capacity],
  );
  return slotId;
}

export function setItemAvailability(itemId: string, available: boolean): void {
  run('UPDATE menu_items SET is_available = ? WHERE id = ?', [available ? 1 : 0, itemId]);
}

export function setCafeAccepting(cafeId: string, accepting: boolean): void {
  run('UPDATE cafes SET is_accepting_orders = ? WHERE id = ?', [accepting ? 1 : 0, cafeId]);
}

export function countRows(sql: string, params: unknown[] = []): number {
  const row = get<{ c: number }>(sql, params);
  return Number(row?.c ?? 0);
}