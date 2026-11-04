import { randomBytes, randomUUID } from 'node:crypto';

/** Primary key generator (UUID v4). */
export function id(): string {
  return randomUUID();
}

/** Short, URL-safe random id (for idempotency keys, event ids, etc.). */
export function shortId(bytes = 16): string {
  return randomBytes(bytes).toString('hex');
}
