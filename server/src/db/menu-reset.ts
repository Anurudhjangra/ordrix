import { run, tx } from './index.js';
import { CAFE_ID, SECOND_CAFE_ID } from './branding.js';
import { runMigrations } from './migrate.js';
import { seed } from './seed.js';

const CAFE_IDS = [CAFE_ID, SECOND_CAFE_ID];

/**
 * Clear every outlet's menu (categories, items and their options) and re-insert
 * the current seed menu. Existing orders are unaffected because order lines
 * store name/price snapshots rather than foreign keys.
 */
export function reseedMenu(): void {
  runMigrations();
  tx(() => {
    for (const cafeId of CAFE_IDS) {
      run(
        'DELETE FROM menu_item_options WHERE menu_item_id IN (SELECT id FROM menu_items WHERE cafe_id = ?)',
        [cafeId],
      );
      run('DELETE FROM menu_items WHERE cafe_id = ?', [cafeId]);
      run('DELETE FROM menu_categories WHERE cafe_id = ?', [cafeId]);
    }
  });
  seed();
}

const isDirectRun = process.argv[1] && process.argv[1].toLowerCase().includes('menu-reset');

if (isDirectRun) {
  reseedMenu();
  console.log('Menu reseeded for', CAFE_IDS.join(', '));
}
