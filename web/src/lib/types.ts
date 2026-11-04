export interface Cafe {
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

export interface CafeStatus {
  open: boolean;
  acceptingOrders: boolean;
  reason: string | null;
}

export interface CafeIndexRow extends Cafe {
  status: CafeStatus;
}

export interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_paise: number;
  is_veg: number;
  is_available: number;
  prep_minutes: number;
  sort_order: number;
}

export interface MenuOption {
  id: string;
  menu_item_id: string;
  group_name: string;
  name: string;
  price_delta_paise: number;
  is_available: number;
  sort_order: number;
}

export interface SlotAvailability {
  id: string;
  cafe_id: string;
  label: string;
  start_time: string;
  end_time: string;
  capacity: number;
  is_active: number;
  sort_order: number;
  booked: number;
  remaining: number;
}

export interface OrderItem {
  id: string;
  name: string;
  price_paise: number;
  quantity: number;
  options: { id: string; name: string; priceDelta: number }[];
  line_total_paise: number;
}

export interface TimelineEntry {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  cafe_id: string;
  cafe_name: string;
  customer_id: string;
  customer_name: string;
  status: string;
  payment_status: string;
  subtotal_paise: number;
  tax_paise: number;
  fee_paise: number;
  total_paise: number;
  pickup_window_label: string | null;
  customer_notes: string | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  collected_at: string | null;
  collected_by: string | null;
  collected_by_name: string | null;
  cancel_reason: string | null;
  payment_provider: string | null;
  orders_ahead: number;
  queue_position: number;
  eta_minutes: number;
  estimated_ready_at: string | null;
  items: OrderItem[];
  timeline: TimelineEntry[];
  pickup_token: { token: string; is_used: number; used_at: string | null } | null;
}

export interface Charges {
  subtotalPaise: number;
  taxPaise: number;
  feePaise: number;
  totalPaise: number;
}

export interface PaymentConfig {
  mode: 'sandbox' | 'razorpay';
  razorpayKeyId: string | null;
}

export interface PaymentInitResult {
  mode: 'sandbox' | 'razorpay';
  orderId?: string;
  alreadyPaid?: boolean;
  amountPaise: number;
  providerOrderId?: string;
  sandboxNote?: string;
  currency?: string;
  razorpayOrderId?: string;
  razorpayKeyId?: string;
}

export interface OrderCreateInput {
  cafeId: string;
  items: { menuItemId: string; quantity: number; optionIds?: string[] }[];
  pickupSlotId?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
}