import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/api';
import { formatDateTime, formatPaise, formatTime, PAYMENT_LABELS, orderStepIndex } from '../lib/format';
import { onSocket, emitSocket } from '../lib/socket';
import { Alert, Button, EmptyState, IconBag, IconCheck, Loader, Modal, SectionTitle, StatusBadge } from '../components/ui';
import type { Order } from '../lib/types';

const STEPS = ['Placed', 'Accepted', 'Preparing', 'Ready', 'Collected'];

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [paying, setPaying] = useState(false);

  const load = () =>
    apiGet<{ order: Order }>(`/api/orders/${id}`)
      .then((res) => setOrder(res.order))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    emitSocket('order:subscribe', id);
    const off = onSocket<{ orderId?: string }>('order:updated', (payload) => {
      if (!payload || payload.orderId === id) load();
    });
    const t = setInterval(load, 8000);
    return () => {
      off();
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const cancel = async () => {
    setBusy(true);
    try {
      const res = await apiPost<{ order: Order }>(`/api/orders/${id}/cancel`, { reason: cancelReason.trim() || null });
      setOrder(res.order);
      setShowCancel(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel order');
    } finally {
      setBusy(false);
    }
  };

  const payNow = async () => {
    setPaying(true);
    try {
      await apiPost(`/api/payments/${id}/create`, {});
      await apiPost(`/api/payments/${id}/verify`, { method: 'sandbox' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <Loader label="Loading order…" />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!order)
    return (
      <EmptyState
        title="Order not found"
        body="It may have been removed, or the link is wrong."
        action={
          <Link to="/orders" className="btn-outline">
            Back to orders
          </Link>
        }
      />
    );

  const isCancellationFlow = order.status === 'cancellation_requested' || order.status === 'rejected' || order.status === 'cancelled';
  const cancelable = order.status === 'awaiting_acceptance' || order.status === 'accepted';
  const paymentNeeded = ['created', 'pending', 'failed'].includes(order.payment_status) && !['cancelled', 'rejected'].includes(order.status);

  return (
    <div>
      <SectionTitle title={`Order #${order.order_number}`} subtitle={order.cafe_name} />

      {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}
      {showCancel ? (
        <Modal open onClose={() => setShowCancel(false)} title="Cancel this order?">
          <p className="text-sm text-stone-600">
            A paid order will be refunded automatically once the cafe accepts the cancellation.
          </p>
          <div className="mt-3">
            <label className="label">Reason (optional)</label>
            <input
              className="input"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. class got rescheduled"
              maxLength={300}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCancel(false)}>
              Keep order
            </Button>
            <Button variant="danger" loading={busy} onClick={cancel}>
              Request cancellation
            </Button>
          </div>
        </Modal>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          {/* Live tracker */}
          <section className="card overflow-hidden p-0">
            {isCancellationFlow ? (
              <div className="flex items-center justify-between p-5">
                <div>
                  <StatusBadge status={order.status} />
                  <p className="mt-1 text-sm text-stone-500">
                    <span className="font-medium text-coffee-800">{STATUS_TAGLINE[order.status] ?? order.status}</span>
                    {order.cancel_reason ? ` — “${order.cancel_reason}”` : ''}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => apiGet<{ order: Order }>(`/api/orders/${id}`).then((r) => setOrder(r.order))}
                >
                  Refresh
                </Button>
              </div>
            ) : (
              <OrderTracker order={order} />
            )}
          </section>

          {/* Items */}
          <section className="card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-bold text-coffee-800">Your items</h3>
              <span className="chip">{order.items.reduce((n, i) => n + i.quantity, 0)} items</span>
            </div>
            <ul className="divide-y divide-coffee-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-coffee-100 text-xs font-bold text-coffee-700">
                      {item.quantity}×
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-coffee-900">{item.name}</p>
                      {item.options.length ? (
                        <p className="mt-0.5 text-xs text-stone-500">{item.options.map((o) => o.name).join(', ')}</p>
                      ) : null}
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold text-coffee-800">{formatPaise(item.line_total_paise)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 rounded-2xl bg-cream-100/70 p-4 text-sm">
              <div className="flex justify-between text-stone-500">
                <dt>Subtotal</dt>
                <dd>{formatPaise(order.subtotal_paise)}</dd>
              </div>
              <div className="flex justify-between text-stone-500">
                <dt>Tax</dt>
                <dd>{formatPaise(order.tax_paise)}</dd>
              </div>
              <div className="flex justify-between text-stone-500">
                <dt>Service fee</dt>
                <dd>{formatPaise(order.fee_paise)}</dd>
              </div>
              <div className="mt-1 flex justify-between border-t border-coffee-200/70 pt-2 text-base font-bold text-coffee-900">
                <dt>Total</dt>
                <dd>{formatPaise(order.total_paise)}</dd>
              </div>
            </dl>
          </section>

          {/* Timeline */}
          <section className="card">
            <h3 className="mb-3 font-display text-lg font-bold text-coffee-800">Timeline</h3>
            <ul className="relative ml-2 space-y-4 border-l border-coffee-200 pl-5">
              {[...order.timeline].reverse().map((entry) => (
                <li key={entry.id} className="relative">
                  <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white bg-accent-500" />
                  <StatusBadge status={entry.to_status} />
                  <p className="mt-0.5 text-xs text-stone-500">
                    {formatDateTime(entry.created_at)}
                    {entry.note ? <span className="text-stone-400"> · {entry.note}</span> : null}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="grid h-fit gap-4">
          <section className="card">
            <h3 className="mb-3 font-display text-lg font-bold text-coffee-800">Pickup</h3>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500">Window</dt>
                <dd className="font-medium">{order.pickup_window_label ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Placed</dt>
                <dd className="font-medium">{formatDateTime(order.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Payment</dt>
                <dd className="font-medium">{PAYMENT_LABELS[order.payment_status] ?? order.payment_status}</dd>
              </div>
              {order.collected_by_name ? (
                <div className="flex justify-between">
                  <dt className="text-stone-500">Collected by</dt>
                  <dd className="font-medium">{order.collected_by_name}</dd>
                </div>
              ) : null}
            </dl>

            {paymentNeeded && !paying ? (
              <Button variant="accent" className="mt-4 w-full" loading={paying} onClick={payNow}>
                Pay now (sandbox)
              </Button>
            ) : null}
            {paying ? <Loader label="Processing sandbox payment…" /> : null}

            {cancelable ? (
              <Button variant="danger" className="mt-2 w-full" onClick={() => setShowCancel(true)}>
                Request cancellation
              </Button>
            ) : null}
          </section>

          {order.pickup_token ? (
            <section className="card text-center">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-widest text-stone-400">Pickup code</h3>
              <p className="font-display text-3xl font-black tracking-widest text-coffee-900">{order.pickup_token.token}</p>
              <p className="mt-1 text-xs text-stone-500">Show this at the counter to collect your order.</p>
            </section>
          ) : null}

          <Button variant="ghost" onClick={() => navigate(-1)}>
            ← Back
          </Button>
        </aside>
      </div>
    </div>
  );
}

const STATUS_TAGLINE: Record<string, string> = {
  rejected: 'This order was turned down by the cafe.',
  cancelled: 'This order was cancelled.',
  cancellation_requested: 'Cancellation is awaiting the cafe.',
};

const QUEUE_STATUSES = ['awaiting_acceptance', 'accepted', 'preparing'];

function OrderTracker({ order }: { order: Order }) {
  const step = Math.max(0, orderStepIndex(order.status));
  const pct = (step / (STEPS.length - 1)) * 100;
  const isActive = QUEUE_STATUSES.includes(order.status);
  const isReady = order.status === 'ready';
  const isCollected = order.status === 'collected';

  return (
    <div>
      {/* Hero: ETA + queue */}
      <div className="relative overflow-hidden bg-gradient-to-br from-coffee-900 via-coffee-800 to-coffee-900 px-6 py-6 text-cream-50">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent-500/25 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-gold-400/15 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span
              className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl ${
                isReady
                  ? 'ready-pulse bg-gradient-to-br from-green-400 to-green-600 text-white'
                  : 'bg-white/10 text-accent-300 ring-1 ring-white/20'
              }`}
            >
              {isReady ? (
                <IconCheck size={30} />
              ) : isCollected ? (
                <IconBag size={28} />
              ) : (
                <span className="font-display text-2xl font-black">
                  {order.eta_minutes > 0 ? order.eta_minutes : '—'}
                </span>
              )}
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-300">
                {isReady ? 'Ready for pickup' : isCollected ? 'Collected' : 'Estimated wait'}
              </p>
              <p className="mt-0.5 font-display text-2xl font-extrabold">
                {isReady
                  ? 'Your order is ready!'
                  : isCollected
                    ? 'Enjoy your order'
                    : `~${order.eta_minutes} min`}
              </p>
              <p className="mt-0.5 text-sm text-coffee-200">
                {isReady
                  ? 'Show your pickup code at the counter.'
                  : isCollected
                    ? 'Thanks for ordering with us.'
                    : order.estimated_ready_at
                      ? `Ready by about ${formatTime(order.estimated_ready_at)}`
                      : 'Preparing your order.'}
              </p>
            </div>
          </div>

          {isActive ? (
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold backdrop-blur">
                <span className="text-accent-300">#{order.queue_position}</span> in queue
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold backdrop-blur">
                {order.orders_ahead === 0 ? 'Next up!' : `${order.orders_ahead} order${order.orders_ahead > 1 ? 's' : ''} ahead`}
              </span>
            </div>
          ) : null}
        </div>

        {/* Progress rail */}
        <div className="relative mt-7">
          <div className="absolute left-[10%] right-[10%] top-3 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/15">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isReady || isCollected ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-accent-400 to-accent-600'
              }`}
              style={{ width: `${isCollected ? 100 : Math.max(0, pct)}%` }}
            />
          </div>
          <ol className="relative flex justify-between">
            {STEPS.map((label, i) => {
              const done = step > i || isCollected;
              const current = step === i && !isCollected;
              const reached = step >= i || isCollected;
              return (
                <li key={label} className="flex flex-1 flex-col items-center gap-2 text-center">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold transition-all duration-500 ${
                      done
                        ? 'bg-green-500 text-white shadow-[0_0_0_3px_rgba(34,197,94,.25)]'
                        : current
                          ? 'bg-accent-500 text-white shadow-[0_0_0_4px_rgba(237,27,36,.28)]'
                          : reached
                            ? 'bg-accent-500 text-white'
                            : 'bg-white/15 text-cream-100/50'
                    }`}
                  >
                    {done ? <IconCheck size={13} /> : i + 1}
                  </span>
                  <span
                    className={`text-[11px] leading-tight ${
                      reached ? 'font-semibold text-cream-50' : 'text-cream-100/45'
                    }`}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}