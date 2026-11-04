// Test-only shim: loads `node:sqlite` through Node's runtime module loader so
// vite-node (which does not recognise `node:sqlite` as a builtin) never tries
// to transform it. Production code imports `node:sqlite` directly.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

interface DatabaseSyncLike {
  new (path: string): {
    exec(sql: string): void;
    close(): void;
    prepare(sql: string): {
      run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
      get(...params: unknown[]): unknown;
      all(...params: unknown[]): unknown[];
    };
  };
}

export const DatabaseSync: DatabaseSyncLike = (
  require('node:sqlite') as { DatabaseSync: DatabaseSyncLike }
).DatabaseSync;