/**
 * Time helpers.
 *
 * The cafe operates in India (IST, UTC+05:30). To keep the MVP dependency-free,
 * "local" times are computed by offsetting UTC by a fixed +5:30. This is exact
 * for IST (which has no daylight saving).
 */

const IST_OFFSET_MINUTES = 5 * 60 + 30;

export function nowIso(): string {
  return new Date().toISOString();
}

/** Returns a Date whose UTC fields represent the current IST wall-clock time. */
export function istNow(): Date {
  const now = new Date();
  return new Date(now.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
}

/** YYYY-MM-DD for the given instant in IST. */
export function istDateString(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** 0=Sunday..6=Saturday for the given instant in IST. */
export function istDayOfWeek(date: Date = new Date()): number {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return shifted.getUTCDay();
}

/** HH:MM for the given instant in IST. */
export function istTimeString(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return shifted.toISOString().slice(11, 16);
}

/** Convert HH:MM to minutes since midnight. */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function isWithinWindow(nowHHMM: string, open: string, close: string): boolean {
  const n = timeToMinutes(nowHHMM);
  return n >= timeToMinutes(open) && n <= timeToMinutes(close);
}
