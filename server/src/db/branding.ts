/**
 * Shared ORDRIX outlet/brand constants.
 *
 * These values are used by the seed script and by the one-time legacy data
 * migration so a rebrand cannot accidentally be applied to only one of them.
 */

export const CAFE_ID = 'ordrix';
export const SECOND_CAFE_ID = 'ordrix-imsar';

export const OWNER_ID = 'user-owner';
export const ADMIN_ID = 'user-admin';

export interface Outlet {
  id: string;
  name: string;
  slug: string;
  address: string;
}

/** ORDRIX runs two outlets on the MDU campus. */
export const OUTLETS: Outlet[] = [
  {
    id: CAFE_ID,
    name: 'ORDRIX · UIET',
    slug: 'ordrix-uiet',
    address: 'UIET, Maharshi Dayanand University, Rohtak, Haryana',
  },
  {
    id: SECOND_CAFE_ID,
    name: 'ORDRIX · IMSAR',
    slug: 'ordrix-imsar',
    address: 'IMSAR, Maharshi Dayanand University, Rohtak, Haryana',
  },
];

export const CAFE_TAGLINE = 'Order smart. Collect fast.';
export const CAFE_DESCRIPTION =
  'ORDRIX serves cold coffee, burgers, wraps, garlic bread, Chinese, loaded fries and freshly made pizzas on the MDU campus, Rohtak.';
export const CAFE_PHONE = '999-605-2000';
export const CAFE_BRAND = '#FF7A2F';

export const PICKUP_SLOTS: [string, string, string, number][] = [
  ['Break 1 (10:45 - 11:15)', '10:45', '11:15', 30],
  ['Lunch (13:00 - 14:00)', '13:00', '14:00', 40],
  ['Break 2 (15:45 - 16:15)', '15:45', '16:15', 30],
  ['Evening (17:30 - 18:30)', '17:30', '18:30', 25],
];

/** Legacy outlet IDs from the original Cafe My Frappe seed, mapped to current IDs. */
export const LEGACY_CAFE_IDS: Record<string, string> = {
  'cafe-my-frapey': CAFE_ID,
  'cafe-my-frappe': CAFE_ID,
  'cafe-my-frappe-imsar': SECOND_CAFE_ID,
};

/** Legacy demo emails that must be migrated to the ORDRIX login identities. */
export const LEGACY_OWNER_EMAILS = [
  'owner@cafemyfrapey.test',
  'owner@cafemyfrappe.test',
  'owner@cafemyfrappey.test',
];
export const LEGACY_ADMIN_EMAILS = [
  'admin@cafemyfrapey.test',
  'admin@cafemyfrappe.test',
  'admin@cafemyfrappey.test',
];
