import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { get, run, tx } from '../db/index.js';
import { runMigrations } from '../db/migrate.js';
import { id } from '../lib/ids.js';

import {
  ADMIN_ID,
  CAFE_BRAND,
  CAFE_DESCRIPTION,
  CAFE_PHONE,
  CAFE_TAGLINE,
  OWNER_ID,
  OUTLETS,
  PICKUP_SLOTS,
} from './branding.js';

const STUDENT_ID = 'user-student';

interface SeedOption {
  group: string;
  name: string;
  deltaPaise: number;
}

interface SeedItem {
  name: string;
  description: string;
  pricePaise: number;
  isVeg: number;
  prep: number;
  image?: string;
  options?: SeedOption[];
}

/**
 * ORDRIX menu (official pricing supplied by the cafe).
 * Prices are in paise. Half/full items are modelled with a "Size" option group
 * where the base price is the Half portion and "Full" carries the difference.
 */
const CATEGORIES: { name: string; items: SeedItem[] }[] = [
  {
    name: 'Coffee & Beverages',
    items: [
      {
        name: 'Cold Coffee',
        description: 'Our signature creamy cold coffee, topped with a chocolate swirl.',
        pricePaise: 7000,
        isVeg: 1,
        prep: 4,
        image: '/menu/cold-coffee.png',
      },
    ],
  },
  {
    name: 'Sandwiches',
    items: [
      {
        name: 'Grilled Sandwich',
        description: 'Veggies and cheese grilled in buttered bread.',
        pricePaise: 13000,
        isVeg: 1,
        prep: 8,
        image: '/menu/grilled-sandwich.png',
      },
    ],
  },
  {
    name: 'Burgers & Fries',
    items: [
      { name: 'Veggie Burger', description: 'Crispy veggie patty with fresh veggies.', pricePaise: 5500, isVeg: 1, prep: 8 },
      { name: 'Classic Burger', description: 'The all-time classic veg burger.', pricePaise: 6500, isVeg: 1, prep: 8 },
      { name: 'Special Burger', description: 'Loaded special burger with house sauce.', pricePaise: 8000, isVeg: 1, prep: 9 },
      { name: 'Burger Maharaja', description: 'King-size burger with extra toppings.', pricePaise: 9000, isVeg: 1, prep: 10 },
      { name: 'Cheese Royal Burger', description: 'Double cheese, royal treatment.', pricePaise: 9000, isVeg: 1, prep: 9 },
      { name: 'Dynamite Paneer Burger', description: 'Spicy dynamite sauce with a paneer patty.', pricePaise: 11000, isVeg: 1, prep: 10 },
      { name: 'Extra Cheese Slice (Burger)', description: 'Add an extra cheese slice to any burger.', pricePaise: 1500, isVeg: 1, prep: 1 },
      {
        name: 'French Fries',
        description: 'Golden, crispy salted fries.',
        pricePaise: 7000,
        isVeg: 1,
        prep: 6,
        options: [
          { group: 'Size', name: 'Regular', deltaPaise: 0 },
          { group: 'Size', name: 'Large', deltaPaise: 1000 },
        ],
      },
      { name: 'Masala Fries', description: 'Fries tossed in tangy masala.', pricePaise: 8500, isVeg: 1, prep: 7 },
      { name: 'Peri Peri Fries', description: 'Fries with fiery peri peri seasoning.', pricePaise: 10000, isVeg: 1, prep: 7 },
    ],
  },
  {
    name: 'Wraps',
    items: [
      { name: 'Mexican Wrap', description: 'Spicy Mexican-style veggie wrap.', pricePaise: 11000, isVeg: 1, prep: 8 },
      { name: 'Paneer Wrap', description: 'Tandoori paneer wrap with fresh salad.', pricePaise: 12000, isVeg: 1, prep: 9 },
    ],
  },
  {
    name: 'Garlic Bread',
    items: [
      {
        name: 'Stuffed Garlic Bread',
        description: 'Cheese-stuffed garlic bread.',
        pricePaise: 11000,
        isVeg: 1,
        prep: 8,
        options: [
          { group: 'Size', name: 'Half', deltaPaise: 0 },
          { group: 'Size', name: 'Full', deltaPaise: 11000 },
        ],
      },
      {
        name: 'Cheese Garlic Bread',
        description: 'Garlic bread topped with mozzarella.',
        pricePaise: 10000,
        isVeg: 1,
        prep: 8,
        image: '/menu/cheese-garlic-bread.png',
        options: [
          { group: 'Size', name: 'Half', deltaPaise: 0 },
          { group: 'Size', name: 'Full', deltaPaise: 9000 },
        ],
      },
      {
        name: 'Special Garlic Bread',
        description: 'House-special loaded garlic bread.',
        pricePaise: 12000,
        isVeg: 1,
        prep: 9,
        options: [
          { group: 'Size', name: 'Half', deltaPaise: 0 },
          { group: 'Size', name: 'Full', deltaPaise: 11000 },
        ],
      },
      { name: 'Garlic Bread Sticks (Paneer & Sweet Corn)', description: 'Garlic bread sticks with paneer and sweet corn.', pricePaise: 13000, isVeg: 1, prep: 8 },
    ],
  },
  {
    name: 'Chinese',
    items: [
      { name: 'Plain Maggie', description: 'Classic masala Maggie noodles.', pricePaise: 4000, isVeg: 1, prep: 4 },
      { name: 'Maggie Masala', description: 'Maggie with extra masala.', pricePaise: 6000, isVeg: 1, prep: 5 },
      { name: 'Cheese Maggi', description: 'Creamy Maggi loaded with cheese.', pricePaise: 8000, isVeg: 1, prep: 6 },
      { name: 'Tandoori Paneer Tikka Maggie', description: 'Maggie with tandoori paneer tikka.', pricePaise: 9000, isVeg: 1, prep: 7 },
      { name: 'Fried Rice (Half)', description: 'Indo-Chinese fried rice, half portion.', pricePaise: 8000, isVeg: 1, prep: 9 },
      { name: 'Fried Rice', description: 'Indo-Chinese fried rice, full portion.', pricePaise: 13000, isVeg: 1, prep: 10 },
      { name: 'Chilly Potato', description: 'Crispy potato in spicy chilli sauce.', pricePaise: 15000, isVeg: 1, prep: 10 },
      { name: 'Honey Chilly Potato', description: 'Sweet-and-spicy honey chilli potato.', pricePaise: 16000, isVeg: 1, prep: 10 },
      { name: 'Manchurian Dry', description: 'Veg Manchurian, dry style.', pricePaise: 16000, isVeg: 1, prep: 10 },
      { name: 'Manchurian Gravy', description: 'Veg Manchurian in rich gravy.', pricePaise: 17000, isVeg: 1, prep: 11 },
    ],
  },
  {
    name: 'Loaded Fries',
    items: [
      { name: 'Cheese Chilly', description: 'Loaded fries with cheese and chilli.', pricePaise: 22000, isVeg: 1, prep: 10 },
      { name: 'Chilly Mushroom', description: 'Loaded fries with chilli mushroom.', pricePaise: 20000, isVeg: 1, prep: 10 },
    ],
  },
  {
    name: 'Pizza',
    items: [
      { name: 'Farm Veggie Pizza', description: 'Onion, tomato and capsicum on 100% fresh dough.', pricePaise: 16000, isVeg: 1, prep: 15, image: '/menu/farm-veggie-pizza.png' },
      { name: 'Margherita Pizza', description: 'Margherita with double mozzarella cheese.', pricePaise: 18000, isVeg: 1, prep: 15 },
      { name: 'Olive Special Pizza', description: 'Olives, jalapeño and OTC.', pricePaise: 19000, isVeg: 1, prep: 16 },
      { name: 'Exotic Vegetarian Pizza', description: 'A garden of exotic veggies.', pricePaise: 21000, isVeg: 1, prep: 16 },
      { name: 'Sizzling Paneer Tikka Pizza', description: 'Sizzling paneer tikka on a cheesy base.', pricePaise: 21000, isVeg: 1, prep: 17 },
      { name: 'Extra Cheese for Pizza', description: 'Add extra cheese to any pizza.', pricePaise: 3000, isVeg: 1, prep: 2 },
      { name: 'Cafe Special Pizza', description: 'Our signature cafe special pizza.', pricePaise: 22000, isVeg: 1, prep: 17 },
    ],
  },
];

function upsertUser(
  userId: string,
  email: string,
  name: string,
  password: string,
  role: 'student' | 'staff' | 'owner' | 'admin',
): void {
  const hash = bcrypt.hashSync(password, 10);
  const existing = get<{ id: string }>('SELECT id FROM users WHERE id = ?', [userId]);
  if (existing) {
    run('UPDATE users SET email = ?, name = ?, password_hash = ?, role = ?, is_active = 1 WHERE id = ?', [
      email,
      name,
      hash,
      role,
      userId,
    ]);
  } else {
    run('INSERT INTO users (id, email, name, password_hash, role, is_active) VALUES (?,?,?,?,?,1)', [
      userId,
      email,
      name,
      hash,
      role,
    ]);
  }
}

export function seed(): void {
  runMigrations();

  tx(() => {
    // Users
    upsertUser(OWNER_ID, config.seed.ownerEmail, 'ORDRIX Owner', config.seed.ownerPassword, 'owner');
    upsertUser(ADMIN_ID, config.seed.adminEmail, 'Platform Admin', config.seed.adminPassword, 'admin');
    upsertUser(STUDENT_ID, config.seed.studentEmail, 'MDU Student', config.seed.studentPassword, 'student');

    // Student profile
    const sp = get('SELECT user_id FROM student_profiles WHERE user_id = ?', [STUDENT_ID]);
    if (!sp) {
      run('INSERT INTO student_profiles (user_id, university, student_id) VALUES (?,?,?)', [
        STUDENT_ID,
        'Maharshi Dayanand University, Rohtak',
        'MDU-DEMO-001',
      ]);
    }

    // Cafes (outlets) — each gets its own hours, owner membership, menu and slots
    for (const outlet of OUTLETS) {
      const cafe = get<{ id: string }>('SELECT id FROM cafes WHERE id = ?', [outlet.id]);
      if (!cafe) {
        run(
          `INSERT INTO cafes (id, name, slug, tagline, description, address, phone, brand_color, is_active, is_accepting_orders)
           VALUES (?,?,?,?,?,?,?,?,1,1)`,
          [outlet.id, outlet.name, outlet.slug, CAFE_TAGLINE, CAFE_DESCRIPTION, outlet.address, CAFE_PHONE, CAFE_BRAND],
        );
      } else {
        run(
          'UPDATE cafes SET name = ?, slug = ?, tagline = ?, description = ?, address = ?, phone = ?, brand_color = ? WHERE id = ?',
          [outlet.name, outlet.slug, CAFE_TAGLINE, CAFE_DESCRIPTION, outlet.address, CAFE_PHONE, CAFE_BRAND, outlet.id],
        );
      }

      // Opening hours: Mon-Sat 09:00-20:00, Sunday closed (tests: open 24/7 so the suite is time-independent)
      const isTest = config.isTest;
      for (let day = 0; day <= 6; day++) {
        const exists = get('SELECT id FROM cafe_opening_hours WHERE cafe_id = ? AND day_of_week = ?', [outlet.id, day]);
        if (!exists) {
          const closed = !isTest && day === 0 ? 1 : 0;
          run(
            'INSERT INTO cafe_opening_hours (id, cafe_id, day_of_week, open_time, close_time, is_closed) VALUES (?,?,?,?,?,?)',
            [id(), outlet.id, day, '00:00', '23:59', closed],
          );
        }
      }

      // Membership for owner (manages every outlet)
      const mem = get('SELECT id FROM cafe_members WHERE cafe_id = ? AND user_id = ?', [outlet.id, OWNER_ID]);
      if (!mem) {
        run('INSERT INTO cafe_members (id, cafe_id, user_id, role_in_cafe) VALUES (?,?,?,?)', [
          id(),
          outlet.id,
          OWNER_ID,
          'owner',
        ]);
      }

      // Menu categories & items (only seed if the cafe has no categories yet)
      const catCount = get<{ c: number }>('SELECT COUNT(*) as c FROM menu_categories WHERE cafe_id = ?', [outlet.id]);
      if (Number(catCount?.c ?? 0) === 0) {
        let catOrder = 0;
        for (const cat of CATEGORIES) {
          const catId = id();
          run('INSERT INTO menu_categories (id, cafe_id, name, sort_order) VALUES (?,?,?,?)', [
            catId,
            outlet.id,
            cat.name,
            catOrder++,
          ]);
          let itemOrder = 0;
          for (const item of cat.items) {
            const itemId = id();
            run(
              `INSERT INTO menu_items (id, cafe_id, category_id, name, description, image_url, price_paise, is_veg, is_available, prep_minutes, sort_order)
               VALUES (?,?,?,?,?,?,?,?,1,?,?)`,
              [itemId, outlet.id, catId, item.name, item.description, item.image ?? null, item.pricePaise, item.isVeg, item.prep, itemOrder++],
            );
            if (item.options) {
              let optOrder = 0;
              for (const opt of item.options) {
                run(
                  'INSERT INTO menu_item_options (id, menu_item_id, group_name, name, price_delta_paise, sort_order) VALUES (?,?,?,?,?,?)',
                  [id(), itemId, opt.group, opt.name, opt.deltaPaise, optOrder++],
                );
              }
            }
          }
        }
      }

      // Pickup slots
      const slotCount = get<{ c: number }>('SELECT COUNT(*) as c FROM pickup_slots WHERE cafe_id = ?', [outlet.id]);
      if (Number(slotCount?.c ?? 0) === 0) {
        let order = 0;
        for (const [label, start, end, capacity] of PICKUP_SLOTS) {
          run(
            'INSERT INTO pickup_slots (id, cafe_id, label, start_time, end_time, capacity, sort_order) VALUES (?,?,?,?,?,?,?)',
            [id(), outlet.id, label, start, end, capacity, order++],
          );
        }
      }
    }

    // Platform settings
    run(
      `INSERT INTO platform_settings (key, value) VALUES ('order_accept_timeout_minutes', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [String(config.orderAcceptTimeoutMinutes)],
    );
  });
}

const isDirectRun =
  process.argv[1] && process.argv[1].toLowerCase().includes('seed');

if (isDirectRun) {
  seed();
  console.log('Seed complete.');
  console.log('  Owner:  ', config.seed.ownerEmail, '/', config.seed.ownerPassword);
  console.log('  Admin:  ', config.seed.adminEmail, '/', config.seed.adminPassword);
  console.log('  Student:', config.seed.studentEmail, '/', config.seed.studentPassword);
  console.log('\nNOTE: If the cafe already had a menu, re-run after clearing it (see menu reseed script).');
}
