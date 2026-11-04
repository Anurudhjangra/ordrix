# Cafe My Frapey

Smart campus food pre-ordering and cafe management platform for **Cafe My Frapey**, near
Maharshi Dayanand University, Rohtak.

Students order in class, pay online, choose a pickup window, and collect between classes using a
single pickup code — no queue. Café staff get a live dashboard to accept/prepare orders, manage the
menu, and verify pickups by code.

---

## Stack

| Layer    | Tech |
| -------- | ---- |
| API      | Node.js ≥ 22.5, Express 4, TypeScript |
| Database | SQLite via built-in `node:sqlite` (no ORM) |
| Auth     | JWT in httpOnly cookie (`cmf_token`), roles: `student / staff / owner / admin` |
| Validation | zod, central error handler |
| Realtime | Socket.IO (`user:`, `cafe:`, `order:` rooms) + 8s polling fallback |
| Web      | React 18, Vite 6, Tailwind CSS 3, React Router 6, Socket.IO client |
| Tests    | Vitest + supertest (server), 30 integration tests |
| Payments | Razorpay adapter (currently **sandbox only**, no credentials configured) |

> Ports: API on `4000`, web dev server on `5173` (proxies `/api`, `/uploads`, `/socket.io`).

---

## Getting started

```bash
# 1. Install (npm workspaces)
npm install

# 2. Configure environment
cp server/.env.example server/.env   # then edit (see below)

# 3. Create and seed the database
npm run migrate
npm run seed

# 4. Run the stack (two terminals)
npm run dev:server      # API + Socket.IO on :4000
npm run dev:web         # React dev server on :5173
```

Open http://localhost:5173.

### Database reset

```bash
npm run reset   # drops and recreates tables, then re-seeds demo data
```

### Tests & checks

```bash
npm test          # vitest integration suite (30 tests)
npm run typecheck # tsc across server + web
npm run build     # production build for server + web
```

---

## Seed accounts

| Role    | Email                  | Password      |
| ------- | ---------------------- | ------------- |
| Student | `student@mdu.test`     | `Student@12345` |
| Owner   | `owner@cafemyfrapey.test` | `Owner@12345` |
| Admin   | `admin@cafemyfrapey.test` | `Admin@12345` |

The seed creates one cafe (open Mon–Sat 09:00–20:00 in prod seed; the test harness and the local
dev DB used for demos run 24/7), a menu with categories/items/options, pickup windows, and staff
membership for the owner.

---

## Environment variables (`server/.env`)

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `PORT` | `4000` | API port |
| `NODE_ENV` | `development` | `development` / `test` / `production` |
| `JWT_SECRET` | (random per install) | Signs auth cookies |
| `PAYMENT_MODE` | `sandbox` | `sandbox` or `production` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | empty | Needed for real payments only |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed web origin |
| `WEB_ORIGIN` | `http://localhost:5173` | Socket.IO CORS + redirect base |

---

## Payments

Payments run through a Razorpay-style adapter. Without merchant credentials the platform runs in
**sandbox mode**: the "pay" step calls `POST /api/payments/:orderId/create` and
`POST /api/payments/:orderId/verify` with `{ method: 'sandbox' }`, which marks the payment verified
and emits the same notifications/audit events as a real capture.

Verified payments are tracked separately from order state. **Cancelling a paid order auto-initiates
a refund** (`payment_status = refund_initiated`); staff mark the refund complete in the dashboard,
which moves the order to `refunded`.

To switch to real payments: set `PAYMENT_MODE=production` and add Razorpay keys, then extend the
adapter in `server/src/lib/payments.ts` to do an actual order capture / verification.

---

## Feature overview

**Students**
- Browse cafes, menus, and option groups (sizes, milk, toppings) with price deltas
- Cart stored locally; single-cafe orders; live price recalc at checkout
- Choose a pickup window (capacity-limited), add notes
- Order tracking timeline with a 5-step stepper (Placed → Accepted → Preparing → Ready → Collected)
- Request cancellation (auto-refund for paid orders)
- Notifications (bell, realtime + polling fallback)
- Profile (name, phone, university)

**Staff / Owners**
- Live order queue (realtime via `cafe:` room + polling fallback)
- Accept / reject, preparing, ready, cancel actions
- Pickup token verification: enter `MF-####` to confirm and mark collected
- Menu manager (categories, items, availability, options)
- Pickup window manager (create / hide / capacity)
- Cafe settings (tax %, service fee, auto-accept timeout, pause/resume orders)
- Pending refunds panel + "refund completed" action

**Admin**
- Platform stats (orders, revenue, pending refunds, users, status distribution)
- User moderation (search, roles, enable/disable)
- Cafe moderation (pause orders, activate/deactivate)
- Order browser with status filter, refunds ledger, audit log

---

## Project structure

```
server/
  src/
    app.ts            # Express app assembly, middleware, error handler
    index.ts          # Entry: bootstrap, migrations, listen, socket server
    config.ts         # env parsing/validation
    db/               # sqlite wrapper (get/all/run/tx/nextCounter), migrations, seed, reset
    lib/              # ids, time, slots, pickup tokens, settings, payments, audit, errors
    middleware/       # auth (JWT cookie), role guards
    modules/          # auth, cafe, menu, orders, payments, notifications, staff, admin
    realtime.ts       # Socket.IO wiring + pub helpers
  tests/              # vitest + supertest suite (helpers, permissions, orders, payments)
web/
  src/
    lib/              # api client, format helpers, socket client, shared types
    store/            # auth + cart context providers
    components/       # ui kit, navbar/shell, route guards
    pages/            # student pages, staff/ (dashboard, menu, slots, settings), admin/
```

## Notes for maintainers

- **SQLite gotcha**: `node:sqlite` throws `column index out of range` (errcode 25) when a single
  parameterized statement mixes literal `NULL`s with `?` placeholders inside a `VALUES` clause.
  Always use `?` placeholders and pass `null` for nullable columns.
- Order numbers and pickup tokens are globally sequential (counters in the `counters` table).
  Token allocation skips sequences already present so historical data never collides.
- Money is stored as integer **paise**; the server recomputes totals at checkout and order time.
- The dev DB (`server/data/`) and local uploads are gitignored.