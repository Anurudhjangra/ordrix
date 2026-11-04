import http from 'node:http';
import { config } from './config.js';
import { createApp } from './app.js';
import { initRealtime } from './realtime.js';
import { runMigrations } from './db/migrate.js';
import { seed } from './db/seed.js';
import { all, get, getDb } from './db/index.js';
import { flagTimedOutOrders, updateOrderStatus } from './modules/orders/service.js';

function bootstrapDatabase(): void {
  try {
    runMigrations();
    const userCount = get<{ c: number }>('SELECT COUNT(*) as c FROM users');
    if (Number(userCount?.c ?? 0) === 0) {
      console.log('[startup] Empty database detected - running seed (development sample data).');
      seed();
    }
    console.log('[startup] Database ready');
  } catch (err) {
    console.error('[startup] Database bootstrap failed:', (err as Error).message);
    throw err;
  }
}

function startTimeoutScheduler(): NodeJS.Timeout {
  // Flag orders that have waited too long for acceptance. Runs every minute.
  const timer = setInterval(() => {
    try {
      const flagged = flagTimedOutOrders();
      if (flagged > 0) console.log(`[timeout] flagged ${flagged} order(s) awaiting acceptance`);
    } catch (err) {
      console.error('[timeout] scheduler error:', (err as Error).message);
    }
  }, 60_000);
  timer.unref();
  return timer;
}

function startDemoScheduler(): NodeJS.Timeout | null {
  // OFF by default: orders only move when a human accepts/prepares/marks ready.
  // Opt in for a solo demo with DEMO_AUTO_ADVANCE=true. Never runs in production.
  if (config.nodeEnv === 'production' || process.env.DEMO_AUTO_ADVANCE !== 'true') return null;
  console.log('[demo] auto-advance ENABLED (DEMO_AUTO_ADVANCE=true)');

  const timer = setInterval(() => {
    try {
      const rows = all<{ id: string; status: string; cafe_id: string; age: number }>(
        `SELECT id, status, cafe_id,
                CAST((julianday('now') - julianday(created_at)) * 86400 AS INTEGER) AS age
         FROM orders
         WHERE status IN ('awaiting_acceptance','accepted','preparing')
           AND created_at >= datetime('now','-10 minutes')`,
      );
      for (const row of rows) {
        const owner =
          get<{ user_id: string }>(
            "SELECT user_id FROM cafe_members WHERE cafe_id = ? AND role_in_cafe = 'owner' LIMIT 1",
            [row.cafe_id],
          ) ??
          get<{ user_id: string }>('SELECT user_id FROM cafe_members WHERE cafe_id = ? LIMIT 1', [
            row.cafe_id,
          ]);
        if (!owner) continue;
        try {
          if (row.status === 'awaiting_acceptance' && row.age >= 10) {
            updateOrderStatus(row.id, 'accepted', owner.user_id, 'Auto-accepted (demo)');
          } else if (row.status === 'accepted' && row.age >= 20) {
            updateOrderStatus(row.id, 'preparing', owner.user_id, 'Auto-preparing (demo)');
          } else if (row.status === 'preparing' && row.age >= 35) {
            updateOrderStatus(row.id, 'ready', owner.user_id, 'Auto-ready (demo)');
          }
        } catch {
          /* another actor changed it first */
        }
      }
    } catch (err) {
      console.error('[demo] scheduler error:', (err as Error).message);
    }
  }, 4000);
  timer.unref();
  return timer;
}

function main(): void {
  bootstrapDatabase();

  const app = createApp();
  const server = http.createServer(app);
  initRealtime(server);
  startTimeoutScheduler();
  startDemoScheduler();

  server.listen(config.port, () => {
    console.log(`\n  Cafe My Frapey API`);
    console.log(`  Environment : ${config.nodeEnv}`);
    console.log(`  Listening   : http://localhost:${config.port}`);
    console.log(`  Payment mode: ${config.payments.mode}`);
    console.log(`  Database    : ${config.databaseUrl}\n`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n[shutdown] received ${signal}`);
    server.close(() => {
      try {
        getDb().close();
      } catch {
        /* ignore */
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
