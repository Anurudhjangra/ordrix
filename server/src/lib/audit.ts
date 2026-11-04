import { id } from './ids.js';
import { run } from '../db/index.js';

export interface AuditInput {
  actorId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: unknown;
  ip?: string | null;
}

/** Record a sensitive action. Never throws into the caller's flow. */
export function audit(input: AuditInput): void {
  try {
    run(
      `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, ip)
       VALUES (?,?,?,?,?,?,?)`,
      [
        id(),
        input.actorId ?? null,
        input.action,
        input.entityType ?? null,
        input.entityId ?? null,
        input.metadata === undefined ? null : JSON.stringify(input.metadata),
        input.ip ?? null,
      ],
    );
  } catch (err) {
    // Auditing must not break the primary operation, but log for investigation.
    console.error('[audit] failed to write audit log:', (err as Error).message);
  }
}
