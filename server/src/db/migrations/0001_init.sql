-- ==========================================================================
-- ORDRIX - Initial schema (SQLite)
-- Money is stored as INTEGER minor units (paise). 1 INR = 100 paise.
-- Timestamps are stored as ISO-8601 UTC text via datetime('now').
-- ==========================================================================

PRAGMA foreign_keys = ON;

-- --------------------------------------------------------------------------
-- Users & roles
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone         TEXT,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('student', 'staff', 'owner', 'admin')),
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  university    TEXT,
  student_id    TEXT,
  default_notes TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- --------------------------------------------------------------------------
-- Cafes
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cafes (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  slug                 TEXT NOT NULL UNIQUE,
  tagline              TEXT,
  description          TEXT,
  address              TEXT,
  phone                TEXT,
  logo_url             TEXT,
  brand_color          TEXT,
  is_active            INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  is_accepting_orders  INTEGER NOT NULL DEFAULT 1 CHECK (is_accepting_orders IN (0, 1)),
  pause_reason         TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cafe_members (
  id           TEXT PRIMARY KEY,
  cafe_id      TEXT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_cafe TEXT NOT NULL CHECK (role_in_cafe IN ('owner', 'staff')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (cafe_id, user_id)
);

CREATE TABLE IF NOT EXISTS cafe_opening_hours (
  id          TEXT PRIMARY KEY,
  cafe_id     TEXT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  open_time   TEXT NOT NULL,  -- 'HH:MM'
  close_time  TEXT NOT NULL,  -- 'HH:MM'
  is_closed   INTEGER NOT NULL DEFAULT 0 CHECK (is_closed IN (0, 1)),
  UNIQUE (cafe_id, day_of_week)
);

-- --------------------------------------------------------------------------
-- Menu
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu_categories (
  id         TEXT PRIMARY KEY,
  cafe_id    TEXT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (cafe_id, name)
);

CREATE TABLE IF NOT EXISTS menu_items (
  id            TEXT PRIMARY KEY,
  cafe_id       TEXT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  category_id   TEXT NOT NULL REFERENCES menu_categories(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  description   TEXT,
  image_url     TEXT,
  price_paise   INTEGER NOT NULL CHECK (price_paise >= 0),
  is_veg        INTEGER NOT NULL DEFAULT 1 CHECK (is_veg IN (0, 1)),
  is_available  INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
  prep_minutes  INTEGER NOT NULL DEFAULT 5 CHECK (prep_minutes >= 0),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS menu_item_options (
  id                 TEXT PRIMARY KEY,
  menu_item_id       TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  group_name         TEXT NOT NULL DEFAULT 'Options',
  name               TEXT NOT NULL,
  price_delta_paise  INTEGER NOT NULL DEFAULT 0,
  is_available       INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- --------------------------------------------------------------------------
-- Pickup slots
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pickup_slots (
  id           TEXT PRIMARY KEY,
  cafe_id      TEXT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  start_time   TEXT NOT NULL,
  end_time     TEXT NOT NULL,
  capacity     INTEGER NOT NULL DEFAULT 20 CHECK (capacity >= 0),
  is_active    INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (cafe_id, label)
);

-- --------------------------------------------------------------------------
-- Orders
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                 TEXT PRIMARY KEY,
  order_number       TEXT NOT NULL UNIQUE,
  cafe_id            TEXT NOT NULL REFERENCES cafes(id) ON DELETE RESTRICT,
  customer_id        TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status             TEXT NOT NULL DEFAULT 'awaiting_acceptance' CHECK (status IN (
                       'awaiting_acceptance','accepted','preparing','ready',
                       'collected','rejected','cancellation_requested',
                       'cancelled','refund_pending','refunded')),
  payment_status     TEXT NOT NULL DEFAULT 'created' CHECK (payment_status IN (
                       'created','pending','verified','failed','refund_initiated',
                       'partially_refunded','refunded')),
  subtotal_paise     INTEGER NOT NULL CHECK (subtotal_paise >= 0),
  tax_paise          INTEGER NOT NULL DEFAULT 0 CHECK (tax_paise >= 0),
  fee_paise          INTEGER NOT NULL DEFAULT 0 CHECK (fee_paise >= 0),
  total_paise        INTEGER NOT NULL CHECK (total_paise >= 0),
  pickup_slot_id     TEXT REFERENCES pickup_slots(id) ON DELETE SET NULL,
  pickup_window_label TEXT,
  customer_notes     TEXT,
  idempotency_key    TEXT UNIQUE,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at        TEXT,
  ready_at           TEXT,
  collected_at       TEXT,
  collected_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  cancelled_at       TEXT,
  cancel_reason      TEXT,
  timeout_flagged_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_cafe_status ON orders(cafe_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id                   TEXT PRIMARY KEY,
  order_id             TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id         TEXT,
  name_snapshot        TEXT NOT NULL,
  price_paise_snapshot INTEGER NOT NULL CHECK (price_paise_snapshot >= 0),
  quantity             INTEGER NOT NULL CHECK (quantity > 0),
  options_snapshot     TEXT, -- JSON array
  line_total_paise     INTEGER NOT NULL CHECK (line_total_paise >= 0),
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id          TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  changed_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- --------------------------------------------------------------------------
-- Payments & refunds
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id                TEXT PRIMARY KEY,
  order_id          TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  provider          TEXT NOT NULL DEFAULT 'sandbox',
  provider_order_id TEXT,
  provider_payment_id TEXT,
  amount_paise      INTEGER NOT NULL CHECK (amount_paise >= 0),
  status            TEXT NOT NULL DEFAULT 'created' CHECK (status IN (
                      'created','pending','verified','failed','refund_initiated',
                      'partially_refunded','refunded')),
  method            TEXT,
  signature         TEXT,
  raw_json          TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_payment
  ON payments(provider, provider_payment_id) WHERE provider_payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS refunds (
  id                 TEXT PRIMARY KEY,
  order_id           TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  payment_id         TEXT REFERENCES payments(id) ON DELETE SET NULL,
  amount_paise       INTEGER NOT NULL CHECK (amount_paise >= 0),
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                       'pending','initiated','processed','failed','cancelled')),
  provider_refund_id TEXT,
  reason             TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);

-- --------------------------------------------------------------------------
-- Notifications
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id     TEXT REFERENCES orders(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT,
  channel      TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','email','sms','push')),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  is_read      INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  error        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  delivered_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- --------------------------------------------------------------------------
-- Pickup tokens
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pickup_tokens (
  id         TEXT PRIMARY KEY,
  cafe_id    TEXT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  order_id   TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  token_date TEXT NOT NULL, -- 'YYYY-MM-DD'
  sequence   INTEGER NOT NULL,
  is_used    INTEGER NOT NULL DEFAULT 0 CHECK (is_used IN (0, 1)),
  used_at    TEXT,
  used_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (cafe_id, token)
);

CREATE INDEX IF NOT EXISTS idx_tokens_lookup ON pickup_tokens(cafe_id, token);

-- --------------------------------------------------------------------------
-- Audit logs & settings
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  metadata    TEXT,
  ip          TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS platform_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- --------------------------------------------------------------------------
-- Counters (atomic sequence allocation, e.g. pickup token numbers)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS counters (
  name  TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);

-- --------------------------------------------------------------------------
-- Processed webhook events (idempotency for payment webhooks)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhook_events (
  id          TEXT PRIMARY KEY,
  provider    TEXT NOT NULL,
  event_id    TEXT NOT NULL,
  event_type  TEXT,
  payload     TEXT,
  processed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (provider, event_id)
);
