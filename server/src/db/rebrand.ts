import { config } from '../config.js';
import { all, get, run, tx } from './index.js';
import {
  CAFE_BRAND,
  CAFE_DESCRIPTION,
  CAFE_PHONE,
  CAFE_TAGLINE,
  LEGACY_ADMIN_EMAILS,
  LEGACY_CAFE_IDS,
  LEGACY_OWNER_EMAILS,
  OUTLETS,
} from './branding.js';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface TokenRow {
  id: string;
  cafe_id: string;
  token: string;
  sequence: number;
}

interface RebrandResult {
  usersUpdated: number;
  cafesUpdated: number;
  tokensUpdated: number;
  warnings: string[];
}

/**
 * One-time, idempotent data migration for databases created by the original
 * Cafe My Frappe build. It keeps all orders/menu/history while moving the
 * visible identity to ORDRIX so the demo owner/admin logins and outlet
 * management work after the frontend rebrand.
 */
export function rebrandLegacyData(): RebrandResult {
  return tx(() => {
    const warnings: string[] = [];
    const result: RebrandResult = {
      usersUpdated: 0,
      cafesUpdated: 0,
      tokensUpdated: 0,
      warnings,
    };

    result.usersUpdated += migrateUser(LEGACY_OWNER_EMAILS, config.seed.ownerEmail, 'ORDRIX Owner', 'owner', warnings);
    result.usersUpdated += migrateUser(LEGACY_ADMIN_EMAILS, config.seed.adminEmail, 'Platform Admin', 'admin', warnings);
    result.cafesUpdated += migrateCafes(warnings);
    result.tokensUpdated += migratePickupTokens();
    return result;
  });
}

function migrateUser(
  legacyEmails: string[],
  targetEmail: string,
  targetName: string,
  targetRole: string,
  warnings: string[],
): number {
  let updated = 0;
  const canonical = get<UserRow>('SELECT id, email, name, role FROM users WHERE email = ?', [targetEmail]);

  for (const legacyEmail of legacyEmails) {
    const legacy = get<UserRow>('SELECT id, email, name, role FROM users WHERE email = ?', [legacyEmail]);
    if (!legacy) continue;

    if (canonical && canonical.id !== legacy.id) {
      warnings.push(
        `Both ${legacyEmail} and ${targetEmail} exist; kept both to avoid changing order history. Sign in with ${targetEmail}.`,
      );
      continue;
    }

    run(
      `UPDATE users SET email = ?, name = ?, role = ?, is_active = 1, updated_at = datetime('now') WHERE id = ?`,
      [targetEmail, targetName, targetRole, legacy.id],
    );
    updated += 1;
  }

  // Make sure the canonical demo identity has the expected display name/role.
  // The password hash is deliberately left untouched.
  if (canonical) {
    run(`UPDATE users SET name = ?, role = ?, is_active = 1, updated_at = datetime('now') WHERE id = ?`, [
      targetName,
      targetRole,
      canonical.id,
    ]);
  }
  return updated;
}

const CAFE_CHILD_TABLES = [
  'cafe_members',
  'cafe_opening_hours',
  'menu_categories',
  'menu_items',
  'pickup_slots',
  'orders',
  'pickup_tokens',
] as const;

function migrateCafes(warnings: string[]): number {
  let updated = 0;

  for (const [legacyId, outletId] of Object.entries(LEGACY_CAFE_IDS)) {
    const legacyCafe = get<{ id: string }>('SELECT id FROM cafes WHERE id = ?', [legacyId]);
    if (!legacyCafe) continue;

    const outlet = OUTLETS.find((o) => o.id === outletId);
    if (!outlet) continue;

    const targetCafe = get<{ id: string }>('SELECT id FROM cafes WHERE id = ?', [outletId]);
    if (!targetCafe) {
      run(
        `INSERT INTO cafes (id, name, slug, tagline, description, address, phone, logo_url, brand_color,
                            is_active, is_accepting_orders, pause_reason, created_at, updated_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, logo_url, ?, is_active, is_accepting_orders, pause_reason, created_at, updated_at
         FROM cafes WHERE id = ?`,
        [outletId, outlet.name, outlet.slug, CAFE_TAGLINE, CAFE_DESCRIPTION, outlet.address, CAFE_PHONE, CAFE_BRAND, legacyId],
      );
    }

    for (const table of CAFE_CHILD_TABLES) {
      run(`UPDATE ${table} SET cafe_id = ? WHERE cafe_id = ?`, [outletId, legacyId]);
    }

    // Carry over any per-cafe token counter so new tokens cannot collide.
    run(
      `UPDATE counters SET name = ?
       WHERE name = ? AND NOT EXISTS (SELECT 1 FROM counters WHERE name = ?)`,
      [`pickup_token:${outletId}`, `pickup_token:${legacyId}`, `pickup_token:${outletId}`],
    );

    const leftovers = CAFE_CHILD_TABLES.reduce((sum, table) => {
      const row = get<{ c: number }>(`SELECT COUNT(*) as c FROM ${table} WHERE cafe_id = ?`, [legacyId]);
      return sum + Number(row?.c ?? 0);
    }, 0);

    if (leftovers === 0) {
      run('DELETE FROM cafes WHERE id = ?', [legacyId]);
    } else {
      warnings.push(`Legacy cafe ${legacyId} still has ${leftovers} linked rows and was kept for safety.`);
    }
    updated += 1;
  }

  for (const outlet of OUTLETS) {
    run(
      `UPDATE cafes SET name = ?, slug = ?, tagline = ?, description = ?, address = ?, phone = ?, brand_color = ?,
                        updated_at = datetime('now')
       WHERE id = ?`,
      [outlet.name, outlet.slug, CAFE_TAGLINE, CAFE_DESCRIPTION, outlet.address, CAFE_PHONE, CAFE_BRAND, outlet.id],
    );
    updated += 1;
  }
  return updated;
}

function formatToken(sequence: number): string {
  return `OR-${String(sequence).padStart(4, '0')}`;
}

function migratePickupTokens(): number {
  const legacyTokens = all<TokenRow>(
    `SELECT id, cafe_id, token, sequence FROM pickup_tokens
     WHERE token LIKE 'MF-%'
     ORDER BY CAST(sequence AS INTEGER), id`,
  );
  if (legacyTokens.length === 0) return 0;

  const existing = new Set(all<{ token: string }>('SELECT token FROM pickup_tokens').map((r) => r.token));
  let maxSequence = Number(get<{ m: number }>('SELECT COALESCE(MAX(sequence), 0) as m FROM pickup_tokens')?.m ?? 0);
  const replacements = new Map<string, string>();

  for (const legacy of legacyTokens) {
    let sequence = Math.max(Number(legacy.sequence) || 1, 1);
    while (existing.has(formatToken(sequence))) sequence += 1;
    const newToken = formatToken(sequence);

    run('UPDATE pickup_tokens SET token = ?, sequence = ? WHERE id = ?', [newToken, sequence, legacy.id]);
    existing.delete(legacy.token);
    existing.add(newToken);
    maxSequence = Math.max(maxSequence, sequence);
    replacements.set(legacy.token, newToken);
  }

  // Keep the global counter ahead of every token now in the table.
  run(
    `INSERT INTO counters (name, value) VALUES ('pickup_token', ?)
     ON CONFLICT(name) DO UPDATE SET value = MAX(value, excluded.value)`,
    [maxSequence],
  );

  // Notifications and logs quote the old code in free text; update those too so
  // students and staff see the same OR-#### token everywhere.
  replaceTokenText('notifications', ['title', 'body', 'error'], replacements);
  replaceTokenText('audit_logs', ['metadata'], replacements);
  replaceTokenText('order_status_history', ['note'], replacements);
  replaceTokenText('orders', ['customer_notes'], replacements);

  return legacyTokens.length;
}

function replaceTokenText(table: string, columns: string[], replacements: Map<string, string>): void {
  const rows = all<Record<string, unknown>>(`SELECT id, ${columns.join(', ')} FROM ${table}`);
  for (const row of rows) {
    for (const column of columns) {
      const original = row[column];
      if (original === null || original === undefined) continue;
      let value = String(original);
      for (const [oldToken, newToken] of replacements) {
        if (value.includes(oldToken)) value = value.split(oldToken).join(newToken);
      }
      if (value !== String(original)) {
        run(`UPDATE ${table} SET ${column} = ? WHERE id = ?`, [value, row.id]);
      }
    }
  }
}
