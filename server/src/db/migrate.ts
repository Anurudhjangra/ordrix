import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function ensureMigrationTable(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function listMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

export function runMigrations(): string[] {
  const db = getDb();
  ensureMigrationTable();
  const applied = new Set(
    (
      db.prepare('SELECT name FROM _migrations').all() as { name: string }[]
    ).map((r) => r.name),
  );
  const freshlyApplied: string[] = [];
  for (const file of listMigrationFiles()) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations(name) VALUES (?)').run(file);
      db.exec('COMMIT');
      freshlyApplied.push(file);
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch {
        /* ignore */
      }
      throw new Error(`Migration failed: ${file}: ${(err as Error).message}`);
    }
  }
  return freshlyApplied;
}

// Allow running directly: `tsx src/db/migrate.ts`
const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const applied = runMigrations();
  if (applied.length) {
    console.log(`Applied ${applied.length} migration(s): ${applied.join(', ')}`);
  } else {
    console.log('Database is up to date. No migrations applied.');
  }
}
