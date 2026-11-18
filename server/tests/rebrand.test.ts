import { beforeEach, describe, expect, it } from 'vitest';
import { config } from '../src/config.js';
import { __setDbForTest, get, run } from '../src/db/index.js';
import { rebrandLegacyData } from '../src/db/rebrand.js';
import { runMigrations } from '../src/db/migrate.js';
import { countRows } from './helpers.js';

function seedLegacyDatabase(): void {
  runMigrations();
  run(
    `INSERT INTO users (id, email, name, password_hash, role, is_active)
     VALUES ('user-owner', 'owner@cafemyfrapey.test', 'Cafe My Frappe Owner', 'legacy-hash', 'owner', 1)`,
  );
  run(
    `INSERT INTO users (id, email, name, password_hash, role, is_active)
     VALUES ('user-admin', 'admin@cafemyfrapey.test', 'Platform Admin', 'legacy-hash', 'admin', 1)`,
  );
  run(
    `INSERT INTO cafes (id, name, slug, is_active, is_accepting_orders)
     VALUES ('cafe-my-frapey', 'Cafe My Frappe · UIET', 'cafe-my-frappe-uiet', 1, 1)`,
  );
  run(
    `INSERT INTO cafe_members (id, cafe_id, user_id, role_in_cafe)
     VALUES ('member-1', 'cafe-my-frapey', 'user-owner', 'owner')`,
  );
  run(
    `INSERT INTO pickup_slots (id, cafe_id, label, start_time, end_time, capacity)
     VALUES ('slot-1', 'cafe-my-frapey', 'Lunch', '13:00', '14:00', 20)`,
  );
  run(
    `INSERT INTO orders (id, order_number, cafe_id, customer_id, subtotal_paise, total_paise, pickup_slot_id)
     VALUES ('order-1', 'MF-0001', 'cafe-my-frapey', 'user-owner', 10000, 10000, 'slot-1')`,
  );
  run(
    `INSERT INTO pickup_tokens (id, cafe_id, order_id, token, token_date, sequence)
     VALUES ('token-1', 'cafe-my-frapey', 'order-1', 'MF-0001', '2026-01-01', 1)`,
  );
  run(
    `INSERT INTO notifications (id, user_id, type, title, body)
     VALUES ('note-1', 'user-owner', 'order_created', 'Order placed', 'Your pickup code is MF-0001')`,
  );
}

describe('legacy ORDRIX data migration', () => {
  beforeEach(() => {
    __setDbForTest(null);
  });

  it('migrates identity, outlet, orders and pickup tokens without losing data', () => {
    seedLegacyDatabase();

    const result = rebrandLegacyData();
    expect(result.usersUpdated).toBe(2);
    expect(result.cafesUpdated).toBeGreaterThan(0);
    expect(result.tokensUpdated).toBe(1);

    const owner = get<{ email: string; name: string; role: string }>(
      'SELECT email, name, role FROM users WHERE id = ?',
      ['user-owner'],
    );
    expect(owner?.email).toBe(config.seed.ownerEmail);
    expect(owner?.name).toBe('ORDRIX Owner');
    expect(owner?.role).toBe('owner');

    const admin = get<{ email: string }>('SELECT email FROM users WHERE id = ?', ['user-admin']);
    expect(admin?.email).toBe(config.seed.adminEmail);

    const cafe = get<{ name: string }>('SELECT name FROM cafes WHERE id = ?', ['ordrix']);
    expect(cafe?.name).toBe('ORDRIX · UIET');
    expect(countRows('SELECT COUNT(*) as c FROM cafes WHERE id = ?', ['cafe-my-frapey'])).toBe(0);

    const member = get<{ cafe_id: string }>('SELECT cafe_id FROM cafe_members WHERE id = ?', ['member-1']);
    expect(member?.cafe_id).toBe('ordrix');
    expect(countRows('SELECT COUNT(*) as c FROM orders WHERE id = ?', ['order-1'])).toBe(1);

    const token = get<{ token: string; sequence: number }>('SELECT token, sequence FROM pickup_tokens WHERE id = ?', [
      'token-1',
    ]);
    expect(token?.token).toBe('OR-0001');
    expect(token?.sequence).toBe(1);

    const notification = get<{ body: string }>('SELECT body FROM notifications WHERE id = ?', ['note-1']);
    expect(notification?.body).toContain('OR-0001');
    expect(notification?.body).not.toContain('MF-0001');
  });

  it('is safe to run again on already migrated data', () => {
    seedLegacyDatabase();
    rebrandLegacyData();
    const ordersBefore = countRows('SELECT COUNT(*) as c FROM orders');
    const tokensBefore = countRows('SELECT COUNT(*) as c FROM pickup_tokens');

    const second = rebrandLegacyData();
    expect(second.usersUpdated).toBe(0);
    expect(second.tokensUpdated).toBe(0);
    expect(second.warnings).toEqual([]);
    expect(countRows('SELECT COUNT(*) as c FROM orders')).toBe(ordersBefore);
    expect(countRows('SELECT COUNT(*) as c FROM pickup_tokens')).toBe(tokensBefore);
  });
});
