import { Router } from 'express';
import { all, get } from '../../db/index.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { notFound } from '../../lib/errors.js';
import { computeCharges, getSettings } from '../../lib/settings.js';
import { getOpeningHours, getSlotAvailability, isOpenNow } from '../../lib/slots.js';

export const cafeRouter = Router();

interface CafeRow {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  brand_color: string | null;
  is_active: number;
  is_accepting_orders: number;
  pause_reason: string | null;
}

function loadCafe(identifier: string): CafeRow | undefined {
  return get<CafeRow>('SELECT * FROM cafes WHERE id = ? OR slug = ?', [identifier, identifier]);
}

export function cafeStatus(cafe: {
  id: string;
  is_active: number;
  is_accepting_orders: number;
  pause_reason?: string | null;
}) {
  const openState = isOpenNow(cafe.id);
  const accepting = cafe.is_active === 1 && cafe.is_accepting_orders === 1 && openState.open;
  let reason: string | null = null;
  if (cafe.is_active !== 1) reason = 'Cafe is temporarily unavailable';
  else if (cafe.is_accepting_orders !== 1)
    reason = cafe.pause_reason ?? 'The cafe has paused online orders';
  else if (!openState.open) reason = openState.reason ?? 'Cafe is closed';
  return { open: openState.open, acceptingOrders: accepting, reason };
}

cafeRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const cafes = all(
      'SELECT id, name, slug, tagline, description, address, brand_color, is_active, is_accepting_orders, pause_reason FROM cafes WHERE is_active = 1',
    ) as unknown as CafeRow[];
    res.json({
      cafes: cafes.map((c) => ({ ...c, status: cafeStatus(c) })),
    });
  }),
);

cafeRouter.get(
  '/:cafeId',
  asyncHandler(async (req, res) => {
    const cafe = loadCafe(req.params.cafeId);
    if (!cafe) throw notFound('Cafe not found');
    res.json({
      cafe: {
        id: cafe.id,
        name: cafe.name,
        slug: cafe.slug,
        tagline: cafe.tagline,
        description: cafe.description,
        address: cafe.address,
        phone: cafe.phone,
        logoUrl: cafe.logo_url,
        brandColor: cafe.brand_color,
      },
      status: cafeStatus(cafe),
      openingHours: getOpeningHours(cafe.id),
      settings: (({ taxPercent, serviceFeePaise }) => ({ taxPercent, serviceFeePaise }))(getSettings()),
    });
  }),
);

cafeRouter.get(
  '/:cafeId/slots',
  asyncHandler(async (req, res) => {
    const cafe = loadCafe(req.params.cafeId);
    if (!cafe) throw notFound('Cafe not found');
    res.json({ slots: getSlotAvailability(cafe.id), status: cafeStatus(cafe) });
  }),
);

cafeRouter.get(
  '/:cafeId/menu',
  asyncHandler(async (req, res) => {
    const cafe = loadCafe(req.params.cafeId);
    if (!cafe) throw notFound('Cafe not found');
    const categories = all<{ id: string; name: string; sort_order: number }>(
      'SELECT id, name, sort_order FROM menu_categories WHERE cafe_id = ? AND is_active = 1 ORDER BY sort_order, name',
      [cafe.id],
    );
    const items = all(
      `SELECT id, category_id, name, description, image_url, price_paise, is_veg, is_available, prep_minutes, sort_order
       FROM menu_items WHERE cafe_id = ? ORDER BY sort_order, name`,
      [cafe.id],
    );
    const options = all(
      `SELECT o.id, o.menu_item_id, o.group_name, o.name, o.price_delta_paise, o.is_available, o.sort_order
       FROM menu_item_options o JOIN menu_items m ON m.id = o.menu_item_id
       WHERE m.cafe_id = ? ORDER BY o.sort_order`,
      [cafe.id],
    );
    res.json({ categories, items, options });
  }),
);

cafeRouter.get(
  '/:cafeId/charges',
  asyncHandler(async (req, res) => {
    const subtotal = Number(req.query.subtotalPaise ?? 0);
    res.json(computeCharges(Number.isFinite(subtotal) ? subtotal : 0));
  }),
);
