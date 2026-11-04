import { get, all } from '../db/index.js';
import { istDayOfWeek, istTimeString, isWithinWindow } from './time.js';

export interface OpeningHourRow {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: number;
}

export interface SlotRow {
  id: string;
  cafe_id: string;
  label: string;
  start_time: string;
  end_time: string;
  capacity: number;
  is_active: number;
  sort_order: number;
}

export interface SlotAvailability extends SlotRow {
  booked: number;
  remaining: number;
}

export function getOpeningHours(cafeId: string): OpeningHourRow[] {
  return all<OpeningHourRow>(
    'SELECT day_of_week, open_time, close_time, is_closed FROM cafe_opening_hours WHERE cafe_id = ? ORDER BY day_of_week',
    [cafeId],
  );
}

export function isOpenNow(cafeId: string): { open: boolean; reason?: string } {
  const hours = getOpeningHours(cafeId);
  // No schedule configured -> treat the cafe as open (avoids blocking new cafes).
  if (hours.length === 0) return { open: true };
  const today = istDayOfWeek();
  const now = istTimeString();
  const todayHours = hours.find((h) => h.day_of_week === today);
  if (!todayHours || todayHours.is_closed) return { open: false, reason: 'Closed today' };
  if (!isWithinWindow(now, todayHours.open_time, todayHours.close_time)) {
    return { open: false, reason: `Open ${todayHours.open_time} - ${todayHours.close_time}` };
  }
  return { open: true };
}

/** Active (not finished/failed) statuses count against a slot's capacity. */
const ACTIVE_STATUSES = ['awaiting_acceptance', 'accepted', 'preparing', 'ready', 'cancellation_requested'];

export function getSlotAvailability(cafeId: string): SlotAvailability[] {
  const slots = all<SlotRow>(
    'SELECT * FROM pickup_slots WHERE cafe_id = ? AND is_active = 1 ORDER BY sort_order',
    [cafeId],
  );
  const placeholders = ACTIVE_STATUSES.map(() => '?').join(',');
  return slots.map((slot) => {
    const row = get<{ c: number }>(
      `SELECT COUNT(*) as c FROM orders WHERE pickup_slot_id = ? AND status IN (${placeholders})`,
      [slot.id, ...ACTIVE_STATUSES],
    );
    const booked = Number(row?.c ?? 0);
    return {
      ...slot,
      booked,
      remaining: Math.max(0, slot.capacity - booked),
    };
  });
}

export function getSlotById(cafeId: string, slotId: string): SlotRow | undefined {
  return get<SlotRow>('SELECT * FROM pickup_slots WHERE id = ? AND cafe_id = ?', [slotId, cafeId]);
}
