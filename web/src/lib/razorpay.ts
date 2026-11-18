export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency?: string;
  name?: string;
  description?: string;
  image?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpayResponse) => void | Promise<void>;
  modal?: { ondismiss?: () => void; escape?: boolean; confirm_close?: boolean };
  retry?: { enabled?: boolean; max_count?: number };
}

export interface RazorpayInstance {
  open: () => void;
  close?: () => void;
  on?: (event: string, callback: (arg: unknown) => void) => void;
}

// Back-compat aliases
export type RazorpayCheckoutResponse = RazorpayResponse;
export type RazorpayCheckoutOptions = RazorpayOptions;

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export {};
