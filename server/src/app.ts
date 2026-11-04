import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { config, SERVER_ROOT, isAllowedOrigin } from './config.js';
import { authRouter } from './modules/auth/routes.js';
import { cafeRouter } from './modules/cafe/routes.js';
import { ordersRouter } from './modules/orders/routes.js';
import { paymentsRouter } from './modules/payments/routes.js';
import { staffRouter } from './modules/staff/routes.js';
import { notificationsRouter } from './modules/notifications/routes.js';
import { adminRouter } from './modules/admin/routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { getDb } from './db/index.js';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: config.isProd ? undefined : false,
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    }),
  );

  app.use(cookieParser());

  // Capture the raw body so payment webhooks can be signature-verified.
  app.use(
    express.json({
      limit: '4mb',
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));

  // Served local uploads (dev image storage).
  app.use('/uploads', express.static(path.join(SERVER_ROOT, 'uploads'), { maxAge: '1h' }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 40,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } },
  });

  const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' } },
  });

  app.get('/api/health', (_req, res) => {
    // Touch the DB so health checks fail loudly if the database is unreachable.
    getDb().prepare('SELECT 1').get();
    res.json({
      status: 'ok',
      mode: config.nodeEnv,
      paymentMode: config.payments.mode,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/ready', (_req, res) => {
    try {
      getDb().prepare('SELECT 1').get();
      res.json({ status: 'ready' });
    } catch (err) {
      res.status(503).json({ status: 'not_ready', error: (err as Error).message });
    }
  });

  app.get('/api/info', (_req, res) => {
    res.json({
      name: 'Cafe My Frappe API',
      version: '1.0.0',
      env: config.nodeEnv,
      paymentMode: config.payments.mode,
      features: {
        realtime: true,
        socketio: true,
        sqlite: true,
        razorpay: config.payments.mode === 'razorpay',
      },
    });
  });

  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/cafes', cafeRouter);
  app.use('/api/orders', writeLimiter, ordersRouter);
  app.use('/api/payments', writeLimiter, paymentsRouter);
  app.use('/api/staff', writeLimiter, staffRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
