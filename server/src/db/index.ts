import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

let _db: DatabaseSync | null = null;

export type Row = Record<string, unknown>;

export function getDb(): DatabaseSync {
  if (_db) return _db;
  const url = config.databaseUrl;
  if (url !== ':memory:') {
    fs.mkdirSync(path.dirname(url), { recursive: true });
  }
  const db = new DatabaseSync(url);
  db.exec('PRAGMA foreign_keys = ON;');
  try {
    db.exec('PRAGMA journal_mode = WAL;');
  } catch {
    /* in-memory databases do not support WAL */
  }
  db.exec('PRAGMA busy_timeout = 5000;');
  _db = db;
  return _db;
}

/** Test helper: replace the singleton with a fresh in-memory database. */
export function __setDbForTest(db: DatabaseSync | null): void {
  _db = db;
}

export function all<T = Row>(sql: string, params: unknown[] = []): T[] {
  return getDb().prepare(sql).all(...(params as never[])) as T[];
}

export function get<T = Row>(sql: string, params: unknown[] = []): T | undefined {
  return getDb().prepare(sql).get(...(params as never[])) as T | undefined;
}

export function run(
  sql: string,
  params: unknown[] = [],
): { changes: number | bigint; lastInsertRowid: number | bigint } {
  return getDb().prepare(sql).run(...(params as never[])) as {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  };
}

export function exec(sql: string): void {
  getDb().exec(sql);
}

/**
 * Run a callback inside an immediate write transaction. Rolls back on error.
 * Not re-entrant; call at the top level of a write use-case only.
 */
export function tx<T>(fn: () => T): T {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* ignore rollback failure */
    }
    throw err;
  }
}

/**
 * Atomically allocate the next value of a named counter and return it.
 * Must be called inside a transaction for concurrency safety.
 */
export function nextCounter(name: string): number {
  run(
    `INSERT INTO counters(name, value) VALUES (?, 1)
     ON CONFLICT(name) DO UPDATE SET value = value + 1`,
    [name],
  );
  const row = get<{ value: number }>(`SELECT value FROM counters WHERE name = ?`, [name]);
  return Number(row?.value ?? 0);
}
