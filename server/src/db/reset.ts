import fs from 'node:fs';
import { config } from '../config.js';
import { getDb } from './index.js';

/** Delete the SQLite database file (and WAL side files). Development convenience. */
function reset(): void {
  const url = config.databaseUrl;
  if (url === ':memory:') {
    console.log('In-memory database - nothing to reset.');
    return;
  }
  try {
    getDb().close();
  } catch {
    /* ignore */
  }
  for (const suffix of ['', '-wal', '-shm']) {
    const file = `${url}${suffix}`;
    if (fs.existsSync(file)) {
      fs.rmSync(file);
      console.log(`Removed ${file}`);
    }
  }
  console.log('Database reset. Run `npm run migrate` and `npm run seed` to rebuild.');
}

reset();
