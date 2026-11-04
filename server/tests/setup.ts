// Runs before every test file. Each worker gets its own fresh in-memory database.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = ':memory:';
process.env.JWT_SECRET = 'test-only-secret';
process.env.PAYMENT_MODE = 'sandbox';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.CORS_ORIGINS = 'http://localhost:5173';