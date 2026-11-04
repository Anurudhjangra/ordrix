import { get, nextCounter, run } from '../db/index.js';
import { istDateString } from './time.js';
import { id } from './ids.js';

/** Generate the next global order number, e.g. "1042". Must run inside a transaction. */
export function allocateOrderNumber(): string {
  const seq = nextCounter('order_number');
  return String(1000 + seq);
}

export interface AllocatedToken {
  tokenId: string;
  token: string;
  sequence: number;
}

/**
 * Allocate a unique pickup token for an order. Must run inside the same
 * transaction that creates the order so allocation is atomic and serialised.
 * Token format: MF-#### (globally increasing so every token is unique;
 * verifying a foreign cafe's token therefore fails cleanly).
 */
export function allocatePickupToken(cafeId: string, orderId: string): AllocatedToken {
  const tokenId = id();
  // The counter may start below sequences allocated by earlier schemes (e.g.
  // per-cafe counters), so skip past any token sequence already in the table.
  let sequence = nextCounter('pickup_token');
  let token = `MF-${String(sequence).padStart(4, '0')}`;
  while (get<{ id: string }>('SELECT id FROM pickup_tokens WHERE token = ?', [token])) {
    sequence = nextCounter('pickup_token');
    token = `MF-${String(sequence).padStart(4, '0')}`;
  }
  run(
    `INSERT INTO pickup_tokens (id, cafe_id, order_id, token, token_date, sequence)
     VALUES (?,?,?,?,?,?)`,
    [tokenId, cafeId, orderId, token, istDateString(), sequence],
  );
  return { tokenId, token, sequence };
}

export function findToken(cafeId: string, token: string) {
  return get<{
    id: string;
    order_id: string;
    token: string;
    is_used: number;
    used_at: string | null;
    token_date: string;
  }>('SELECT id, order_id, token, is_used, used_at, token_date FROM pickup_tokens WHERE cafe_id = ? AND token = ?', [
    cafeId,
    token.trim().toUpperCase(),
  ]);
}
