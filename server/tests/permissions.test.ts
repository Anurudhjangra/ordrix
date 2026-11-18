import { beforeAll, describe, expect, it } from 'vitest';
import {
  app,
  agent,
  setupDatabase,
  login,
  register,
  CREDENTIALS,
  createPaidOrder,
  addCafeAndItem,
} from './helpers.js';

async function agentFor(role: 'student' | 'owner' | 'admin') {
  const ctx = agent();
  const cred = CREDENTIALS[role];
  await login(ctx, cred.email, cred.password);
  return ctx;
}

describe('roles and permissions', () => {
  beforeAll(setupDatabase);

  it('blocks students from staff/owner endpoints', async () => {
    const student = await agentFor('student');
    const dash = await student.get('/api/staff/dashboard');
    expect(dash.status).toBe(403);
    const verify = await student.post('/api/staff/pickup/verify').send({ token: 'OR-0001' });
    expect(verify.status).toBe(403);
    const refund = await student.post('/api/staff/orders/x/refund').send({});
    expect(refund.status).toBe(403);
  });

  it('blocks non-admins from the admin panel', async () => {
    const owner = await agentFor('owner');
    const asOwner = await owner.get('/api/admin/users');
    expect(asOwner.status).toBe(403);

    const student = await agentFor('student');
    const asStudent = await student.get('/api/admin/stats');
    expect(asStudent.status).toBe(403);

    const admin = await agentFor('admin');
    const asAdmin = await admin.get('/api/admin/users');
    expect(asAdmin.status).toBe(200);
  });

  it('prevents a customer from viewing another customer\'s order', async () => {
    const a = await agentFor('student');
    const fixture = await createPaidOrder(a);
    const b = agent();
    await register(b, { name: 'Other Student', email: `other-${Date.now()}@mdu.test`, password: 'Student@12345' });
    const res = await b.get(`/api/orders/${fixture.orderId}`);
    expect(res.status).toBe(403);
  });

  it('keeps one cafe\'s staff away from another cafe\'s data', async () => {
    addCafeAndItem();
    const owner = await agentFor('owner'); // belongs to ordrix
    const dashes = await owner.get('/api/staff/dashboard?cafeId=cafe-two');
    expect(dashes.status).toBe(403);
    const menu = await owner.get('/api/staff/menu?cafeId=cafe-two');
    expect(menu.status).toBe(403);
  });

  it('requires authentication for protected routes', async () => {
    const res = await app.get('/api/orders');
    expect(res.status).toBe(401);
    const dash = await app.get('/api/staff/dashboard');
    expect(dash.status).toBe(401);
  });

  it('admin can review platform statistics', async () => {
    const admin = await agentFor('admin');
    const res = await admin.get('/api/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('orders');
    expect(res.body).toHaveProperty('users');
  });
});