# Razorpay Setup (ORDRIX)

This project already has Razorpay integration implemented (server + web checkout). You only need to add your keys.

## 1) Get Razorpay keys

1. Create/login to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Switch to **Test Mode** for development
3. Go to **Settings → API Keys → Generate Key**
4. Copy:
   - `Key ID` (starts with `rzp_test_...` in test mode)
   - `Key Secret`

## 2) Configure server env

Edit `server/.env`:

```env
PAYMENT_MODE=razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=   # optional for local checkout flow; required for webhooks
```

> Never commit real secrets. `server/.env` is gitignored.

## 3) Restart server

```powershell
cd E:\ORDRIX
# stop old server if running
taskkill /F /IM node.exe
npm run dev:server
```

## 4) Test checkout

1. Open the web app
2. Add items to cart and go to checkout
3. You should see "Secure payment via Razorpay is enabled"
4. Place order → Razorpay checkout opens
5. In **Test Mode**, use Razorpay test methods (e.g., test UPI/card/netbanking as shown in Razorpay docs/dashboard)

## How it works

- **Client** calls `POST /api/payments/:orderId/create`
- **Server** creates a Razorpay Order (Orders API) and returns `razorpayOrderId` + `razorpayKeyId`
- **Razorpay Checkout** opens in browser
- On success, client sends `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` to `POST /api/payments/:orderId/verify`
- **Server verifies signature** (`HMAC SHA256` of `order_id|payment_id` using key secret) and marks payment verified
- **Webhook** endpoint: `POST /api/payments/webhook/razorpay` (optional but recommended for production). Set `RAZORPAY_WEBHOOK_SECRET` and configure webhook URL in Razorpay dashboard.

## Sandbox fallback

If `PAYMENT_MODE=razorpay` but keys are missing/empty, the app safely falls back to **sandbox mode** (no real money). This is intentional so local dev doesn't break.

## Production checklist

- Use **Live Mode** keys (`rzp_live_...`)
- Set `PAYMENT_MODE=razorpay`
- Set strong `JWT_SECRET` and `COOKIE_SECURE=true` (behind HTTPS)
- Configure `RAZORPAY_WEBHOOK_SECRET` and webhook URL
- Use persistent DB storage (volume) for SQLite, or migrate to Postgres if scaling
- Restrict `CORS_ORIGINS` to your real domain
