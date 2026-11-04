import { get, run } from '../db/index.js';

export interface Settings {
  taxPercent: number;
  serviceFeePaise: number;
  orderAcceptTimeoutMinutes: number;
  defaultPickupWindowMinutes: number;
}

const DEFAULTS: Settings = {
  taxPercent: 0,
  serviceFeePaise: 0,
  orderAcceptTimeoutMinutes: 10,
  defaultPickupWindowMinutes: 15,
};

function read(key: string): string | null {
  const row = get<{ value: string | null }>('SELECT value FROM platform_settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export function getSettings(): Settings {
  return {
    taxPercent: Number(read('tax_percent') ?? DEFAULTS.taxPercent),
    serviceFeePaise: Number(read('service_fee_paise') ?? DEFAULTS.serviceFeePaise),
    orderAcceptTimeoutMinutes: Number(
      read('order_accept_timeout_minutes') ?? DEFAULTS.orderAcceptTimeoutMinutes,
    ),
    defaultPickupWindowMinutes: Number(
      read('default_pickup_window_minutes') ?? DEFAULTS.defaultPickupWindowMinutes,
    ),
  };
}

export function setSetting(key: string, value: string): void {
  run(
    `INSERT INTO platform_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [key, value],
  );
}

/**
 * Compute tax and fees for a subtotal using platform settings.
 * Tax is rounded to the nearest paise.
 */
export function computeCharges(subtotalPaise: number): {
  subtotalPaise: number;
  taxPaise: number;
  feePaise: number;
  totalPaise: number;
} {
  const settings = getSettings();
  const taxPaise = Math.round((subtotalPaise * settings.taxPercent) / 100);
  const feePaise = settings.serviceFeePaise;
  return {
    subtotalPaise,
    taxPaise,
    feePaise,
    totalPaise: subtotalPaise + taxPaise + feePaise,
  };
}
