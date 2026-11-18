import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(__dirname, '..');

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function list(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

export const config = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT ?? 4000),

  // SQLite database file. Resolved relative to the server package root when relative.
  databaseUrl: (() => {
    const raw = process.env.DATABASE_URL ?? './data/cafe.db';
    if (raw === ':memory:') return raw;
    return path.isAbsolute(raw) ? raw : path.resolve(SERVER_ROOT, raw);
  })(),

  corsOrigins: list(process.env.CORS_ORIGINS).length
    ? list(process.env.CORS_ORIGINS)
    : ['http://localhost:5173', 'http://localhost:4173'],

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    cookieName: 'ordrix_token',
  },

  cookieSecure: bool(process.env.COOKIE_SECURE, nodeEnv === 'production'),

  payments: {
    mode: (process.env.PAYMENT_MODE ?? 'sandbox') as 'sandbox' | 'razorpay',
    razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  },

  orderAcceptTimeoutMinutes: Number(process.env.ORDER_ACCEPT_TIMEOUT_MINUTES ?? 10),

  seed: {
    ownerEmail: process.env.SEED_OWNER_EMAIL ?? 'owner@ordrix.test',
    ownerPassword: process.env.SEED_OWNER_PASSWORD ?? 'Owner@12345',
    adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@ordrix.test',
    adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345',
    studentEmail: process.env.SEED_STUDENT_EMAIL ?? 'student@mdu.test',
    studentPassword: process.env.SEED_STUDENT_PASSWORD ?? 'Student@12345',
  },
};

if (config.isProd && config.jwt.secret === 'dev-only-insecure-secret-change-me') {
  // Fail fast rather than run production with a known secret.
  throw new Error('JWT_SECRET must be set to a strong random value in production.');
}

if (config.isProd && !config.cookieSecure) {
  console.warn('[config] COOKIE_SECURE is false in production. Set COOKIE_SECURE=true behind HTTPS.');
}

if (config.payments.mode === 'razorpay' && !(config.payments.razorpayKeyId && config.payments.razorpayKeySecret)) {
  console.warn(
    '[config] PAYMENT_MODE=razorpay but RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET are missing. Falling back to sandbox (no real money charged).'
  );
} else if (config.payments.mode === 'razorpay') {
  console.log('[config] Razorpay payment mode enabled (keys present).');
}

/**
 * Decide whether a browser origin may talk to the API.
 * In development any localhost/127.0.0.1 port is allowed (Vite may pick 5174,
 * 5175, … when the default port is busy). Production stays strict to
 * CORS_ORIGINS.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin / non-browser clients (curl, tests)
  if (config.corsOrigins.includes(origin)) return true;
  if (!config.isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

export type AppConfig = typeof config;
