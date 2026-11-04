import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/api';
import { useCart } from '../store/cart';
import { useAuth } from '../store/auth';
import { formatPaise } from '../lib/format';
import { Alert, Button, Field, Loader, SectionTitle, Textarea } from '../components/ui';
import type { Charges, PaymentConfig, PaymentInitResult, SlotAvailability } from '../lib/types';

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay checkout. Check your connection.'));
    document.body.appendChild(script);
  });
}

export function CheckoutPage() {
  const { lines, subtotalPaise, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const cafeId = useMemo(() => lines[0]?.cafeId ?? '', [lines]);
  const [charges, setCharges] = useState<Charges | null>(null);
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [slotId, setSlotId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'paying' | 'verifying'>('form');
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [payMode, setPayMode] = useState<'sandbox' | 'razorpay'>('sandbox');

  useEffect(() => {
    if (!cafeId) return;
    (async () => {
      const [ch, sl] = await Promise.all([
        apiGet<Charges>(`/api/cafes/${cafeId}/charges?subtotalPaise=${subtotalPaise}`),
        apiGet<{ slots: SlotAvailability[] }>(`/api/cafes/${cafeId}/slots`),
      ]);
      setCharges(ch);
      setSlots(sl.slots.filter((s) => s.remaining > 0));
      if (sl.slots.length && !sl.slots.some((s) => s.id === slotId)) {
        setSlotId(sl.slots[0].id);
      }
    })().catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cafeId, subtotalPaise]);

  useEffect(() => {
    apiGet<PaymentConfig>('/api/payments/config')
      .then((c) => setPayMode(c.mode))
      .catch(() => setPayMode('sandbox'));
  }, []);

  if (lines.length === 0 && !createdOrderId) {
    return (
      <div>
        <SectionTitle title="Checkout" />
        <EmptyCart />
      </div>
    );
  }

  const runRazorpayCheckout = (orderId: string, orderNumber: string | undefined, init: PaymentInitResult) =>
    loadRazorpayScript().then(
      () =>
        new Promise<void>((resolve, reject) => {
          if (!window.Razorpay || !init.razorpayOrderId || !init.razorpayKeyId) {
            reject(new Error('Razorpay is unavailable.'));
            return;
          }
          const rzp = new window.Razorpay({
            key: init.razorpayKeyId,
            amount: init.amountPaise,
            currency: init.currency ?? 'INR',
            name: 'Cafe My Frappe',
            description: orderNumber ? `Order ${orderNumber}` : 'Campus order',
            order_id: init.razorpayOrderId,
            prefill: { name: user?.name, email: user?.email },
            notes: { orderId },
            theme: { color: '#ED1B24' },
            handler: (response) => {
              apiPost(`/api/payments/${orderId}/verify`, {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              })
                .then(() => resolve())
                .catch(reject);
            },
            modal: {
              ondismiss: () => reject(new Error('Payment was cancelled.')),
            },
          });
          rzp.open();
        }),
    );

  const submit = async () => {
    if (!slotId) {
      setError('Please choose a pickup window.');
      return;
    }
    setError(null);
    setStep('paying');
    try {
      const idem = `web-${cafeId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const res = await apiPost<{ order: { id: string; order_number?: string } }>('/api/orders', {
        cafeId,
        items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity, optionIds: l.optionIds })),
        pickupSlotId: slotId,
        notes: notes.trim() || null,
        idempotencyKey: idem,
      });
      const orderId = res.order.id;
      setCreatedOrderId(orderId);

      setStep('verifying');
      const init = await apiPost<PaymentInitResult>(`/api/payments/${orderId}/create`, {});

      if (init.mode === 'razorpay' && init.razorpayOrderId && init.razorpayKeyId) {
        await runRazorpayCheckout(orderId, res.order.order_number, init);
      } else {
        await apiPost(`/api/payments/${orderId}/verify`, { method: 'sandbox' });
      }
      clear();
      navigate(`/orders/${orderId}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong placing your order');
      setStep('form');
    }
  };

  return (
    <div>
      <SectionTitle title="Checkout" subtitle="Choose a pickup window, review totals, and pay." />
      {step !== 'form' ? (
        <div className="card text-center">
          <Loader label={step === 'paying' ? 'Placing your order…' : 'Confirming payment…'} />
          <p className="mt-2 text-sm text-stone-500">
            {payMode === 'razorpay' ? 'Complete the payment in the secure Razorpay window.' : 'In sandbox mode this is simulated — no real money moves.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            {error ? <Alert>{error}</Alert> : null}

            <section className="card">
              <h3 className="mb-3 font-display text-lg font-bold text-coffee-800">Pickup window</h3>
              {slots.length === 0 ? (
                <p className="text-sm text-stone-500">No pickup windows are available for this cafe right now.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {slots.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSlotId(s.id)}
                      className={`rounded-lg border p-3 text-left text-sm transition ${
                        slotId === s.id ? 'border-accent-500 bg-accent-50' : 'border-coffee-200 bg-white hover:border-coffee-300'
                      }`}
                    >
                      <span className="block font-semibold text-coffee-900">{s.label}</span>
                      <span className="block text-xs text-stone-500">
                        {s.start_time} – {s.end_time} · {s.remaining} left
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="card">
              <h3 className="mb-3 font-display text-lg font-bold text-coffee-800">Order notes</h3>
              <Field label="Notes for the cafe (optional)">
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergies, preferences, or nothing at all." maxLength={300} />
              </Field>
            </section>
          </div>

          <aside className="card h-fit">
            <h3 className="font-display text-lg font-bold text-coffee-800">Summary</h3>
            <ul className="mt-3 space-y-1 text-sm text-stone-600">
              {lines.map((l) => (
                <li key={l.key} className="flex justify-between gap-2">
                  <span className="truncate">
                    {l.quantity}× {l.name}
                  </span>
                  <span className="shrink-0 font-medium">{formatPaise(l.unitPricePaise * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500">Subtotal</dt>
                <dd className="font-medium">{formatPaise(charges?.subtotalPaise ?? subtotalPaise)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Tax</dt>
                <dd className="font-medium">{formatPaise(charges?.taxPaise ?? 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Service fee</dt>
                <dd className="font-medium">{formatPaise(charges?.feePaise ?? 0)}</dd>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold text-coffee-900">
                <dt>Total</dt>
                <dd>{formatPaise(charges?.totalPaise)}</dd>
              </div>
            </dl>
            <Button variant="accent" className="mt-4 w-full" disabled={slots.length === 0} onClick={submit}>
              Place order &amp; pay
            </Button>
            <p className="mt-2 text-center text-xs text-stone-400">
              {payMode === 'razorpay' ? 'Secure payment via Razorpay · UPI, cards & wallets' : 'Sandbox payment · no real charge'}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="card text-center">
      <p className="text-lg font-semibold text-coffee-800">Your cart is empty.</p>
      <Link to="/menu" className="btn-accent mt-4">
        Back to the menu
      </Link>
    </div>
  );
}