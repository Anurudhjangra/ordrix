# ORDRIX - Server (API)

Node.js + Express + TypeScript + SQLite + Socket.IO backend for ORDRIX campus pre-ordering app.

## Tech Stack
- **Runtime**: Node.js >= 22.5
- **Framework**: Express 4
- **Language**: TypeScript (ESM)
- **DB**: SQLite (`node:sqlite`) with WAL
- **Realtime**: Socket.IO
- **Auth**: JWT (httpOnly cookie)
- **Validation**: Zod
- **Payments**: Sandbox or Razorpay

## Quick Start
```bash
# from repo root
npm install

# run migrations + seed (dev)
npm run migrate
npm run seed

# dev
npm run dev:server
```

Server runs at `http://localhost:4000`

## Scripts
- `npm run dev` - start with tsx watch
- `npm run build` - compile to dist/
- `npm run start` - run compiled server
- `npm run migrate` - apply migrations
- `npm run seed` - seed sample data
- `npm run typecheck` - type check
- `npm run test` - run tests

## Environment
Copy `.env.example` to `.env` and update values.

Key vars:
- `PORT`, `NODE_ENV`, `CORS_ORIGINS`
- `DATABASE_URL` (use `./data/cafe.db` or absolute path; for volumes use e.g. `/data/cafe.db`)
- `JWT_SECRET`, `JWT_EXPIRES_IN`, `COOKIE_SECURE`
- `PAYMENT_MODE` (`sandbox` | `razorpay`) + Razorpay keys
- `ORDER_ACCEPT_TIMEOUT_MINUTES`
- `DEMO_AUTO_ADVANCE` (`true` only for local solo demo)

## API
Base: `/api`

- `GET /api/health` - liveness + DB check
- `GET /api/ready` - readiness check
- `GET /api/info` - API metadata
- `POST /api/auth/*` - auth
- `GET/POST /api/cafes/*` - cafes/menu/slots
- `GET/POST /api/orders/*` - orders
- `POST /api/payments/*` - payments
- `GET/POST /api/staff/*` - staff/owner
- `GET/POST /api/notifications/*` - notifications
- `GET/PATCH /api/admin/*` - admin

## Realtime
Socket.IO on same server. Events: `order:created`, `order:updated`, `notification:new`. Rooms: `cafe:<id>`, `order:<id>`, `user:<id>`. Clients join `order:<id>` via `order:subscribe`.

## Deploy Notes
- **Fly.io**: attach a volume to `/data` and set `DATABASE_URL=/data/cafe.db`
- **Railway**: use a volume mounted to the data dir and set same
- Keep `JWT_SECRET` strong in prod and `COOKIE_SECURE=true` behind HTTPS
- SQLite needs persistent disk (avoid ephemeral FS like Render free for SQLite)
- `trust proxy` enabled for behind proxies/load balancers

## Default Accounts (seed)
- Admin: `admin@ordrix.test` / `Admin@12345`
- Owner: `owner@ordrix.test` / `Owner@12345`
- Student: `student@mdu.test` / `Student@12345`
