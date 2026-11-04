import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '../../lib/api';
import { formatCount, formatDateTime, formatPaise, PAYMENT_LABELS } from '../../lib/format';
import { onSocket } from '../../lib/socket';
import { Alert, Button, Loader, Modal, SectionTitle, StatusBadge } from '../../components/ui';
import type { Order } from '../../lib/types';

interface DashboardData {
  cafeId: string;
  cafes: { id: string; name: string }[];
  orders: Record<string, number> & { today: number };
  sales: {
    verifiedRevenuePaise: number;
    verifiedOrderCount: number;
    pendingPaymentsPaise: number;
    pendingPaymentCount: number;
    pendingRefundCount: number;
    pendingRefundPaise: number;
  };
  workload: number;
  settings: { taxPercent: number; serviceFeePaise: number; orderAcceptTimeoutMinutes: number; defaultPickupWindowMinutes: number };
}

interface TargetAction {
  order: Order;
  kind: 'accept' | 'reject' | 'preparing' | 'ready' | 'cancel';
}

const KIND_INFO: Record<TargetAction['kind'], { label: string; needsReason: boolean }> = {
  accept: { label: 'Accept', needsReason: false },
  reject: { label: 'Reject', needsReason: true },
  preparing: { label: 'Start preparing', needsReason: false },
  ready: { label: 'Mark ready', needsReason: false },
  cancel: { label: 'Cancel', needsReason: true },
};

export function StaffDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<TargetAction | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [selectedCafeId, setSelectedCafeId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const qs = selectedCafeId ? `?cafeId=${encodeURIComponent(selectedCafeId)}` : '';
      const ordersQs = selectedCafeId
        ? `?context=active&cafeId=${encodeURIComponent(selectedCafeId)}`
        : '?context=active';
      const [d, q] = await Promise.all([
        apiGet<DashboardData>(`/api/staff/dashboard${qs}`),
        apiGet<{ orders: Order[] }>(`/api/staff/orders${ordersQs}`),
      ]);
      setData(d);
      setOrders(q.orders);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedCafeId]);

  useEffect(() => {
    load();
    const offUpdated = onSocket('order:updated', () => load());
    const offCreated = onSocket('order:created', () => load());
    const t = setInterval(load, 8000);
    return () => {
      offUpdated();
      offCreated();
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const runAction = async (order: Order, kind: TargetAction['kind']) => {
    setBusy(true);
    setError(null);
    try {
      const info = KIND_INFO[kind];
      await apiPost(`/api/staff/orders/${order.id}/${kind}`, info.needsReason ? { reason: reason.trim() || 'Cancelled by cafe' } : {});
      setTarget(null);
      setReason('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader label="Loading your cafe…" />;
  if (!data) return <p className="text-sm text-red-600">{error}</p>;

  const refundNeeded = orders.filter((o) => o.payment_status === 'refund_initiated');

  const actionsFor = (status: string): TargetAction['kind'][] => {
    switch (status) {
      case 'awaiting_acceptance':
        return ['accept', 'reject'];
      case 'accepted':
        return ['preparing', 'cancel'];
      case 'preparing':
        return ['ready', 'cancel'];
      default:
        return [];
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <SectionTitle title="Cafe dashboard" subtitle="Live orders, workload, and sales at a glance." />
        {data.cafes.length > 1 ? (
          <label className="flex items-center gap-2 text-xs font-semibold text-stone-500">
            Outlet
            <select
              className="input max-w-[220px] py-1.5"
              value={selectedCafeId ?? data.cafeId}
              onChange={(e) => setSelectedCafeId(e.target.value)}
            >
              {data.cafes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active orders" value={formatCount(data.orders.awaitingAcceptance + data.orders.accepted + data.orders.preparing + data.orders.ready)} hint={`${data.orders.today} placed today`} />
        <StatCard label="Workload" value={formatCount(data.workload)} hint="accepted + preparing" />
        <StatCard label="Revenue (verified)" value={formatPaise(data.sales.verifiedRevenuePaise)} hint={`${data.sales.verifiedOrderCount} paid orders`} />
        <StatCard label="Pending refunds" value={formatCount(data.sales.pendingRefundCount)} hint={formatPaise(data.sales.pendingRefundPaise)} />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Button variant="accent" onClick={() => setVerifyOpen(true)}>
          Verify pickup token
        </Button>
        <Link to="/staff/menu" className="btn-outline">
          Manage menu
        </Link>
        <Link to="/staff/slots" className="btn-outline">
          Pickup windows
        </Link>
        <Link to="/staff/settings" className="btn-ghost">
          Settings
        </Link>
      </div>

      {refundNeeded.length ? (
        <section className="card mb-6 border-amber-200 bg-amber-50">
          <h3 className="mb-2 font-display text-lg font-bold text-amber-800">Refunds awaiting completion</h3>
          <ul className="grid gap-2">
            {refundNeeded.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  #{o.order_number} · {formatPaise(o.total_paise)} · {PAYMENT_LABELS[o.payment_status]}
                </span>
                <Button size="sm" onClick={() => apiPost(`/api/staff/orders/${o.id}/refund`, {}).then(load).catch(() => {})}>
                  Mark refund done
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card">
        <h3 className="mb-4 font-display text-lg font-bold text-coffee-800">Live order queue</h3>
        {orders.length === 0 ? (
          <p className="text-sm text-stone-500">No active orders. New orders will pop in here in real time.</p>
        ) : (
          <ul className="grid gap-3">
            {orders.map((order) => (
              <li key={order.id} className="rounded-xl border border-coffee-100 bg-cream-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link to={`/orders/${order.id}`} className="font-display text-lg font-bold text-coffee-900 hover:text-accent-600">
                        #{order.order_number}
                      </Link>
                      <StatusBadge status={order.status} />
                      <span className="badge bg-white text-stone-500">
                        {PAYMENT_LABELS[order.payment_status] ?? order.payment_status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {order.customer_name} · placed {formatDateTime(order.created_at)} · {order.pickup_window_label ?? 'window TBA'}
                    </p>
                    <ul className="mt-2 grid gap-1 text-sm">
                      {order.items.map((it) => (
                        <li key={it.id} className="flex justify-between gap-3 text-coffee-800">
                          <span>
                            {it.quantity}× {it.name}
                            {it.options.length ? <span className="text-stone-500"> ({it.options.map((o) => o.name).join(', ')})</span> : null}
                          </span>
                          <span className="shrink-0">{formatPaise(it.line_total_paise)}</span>
                        </li>
                      ))}
                    </ul>
                    {order.customer_notes ? (
                      <p className="mt-2 rounded bg-coffee-100 px-2 py-1 text-xs text-coffee-700">“{order.customer_notes}”</p>
                    ) : null}
                    {order.pickup_token ? (
                      <p className="mt-2 text-xs text-stone-400">
                        Pickup code: <span className="font-mono font-bold text-coffee-800">{order.pickup_token.token}</span>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {actionsFor(order.status).map((kind) => (
                      <Button key={kind} variant={kind === 'reject' || kind === 'cancel' ? 'danger' : kind === 'ready' ? 'accent' : 'primary'} size="sm" onClick={() => { setReason(''); setTarget({ order, kind }); }}>
                        {KIND_INFO[kind].label}
                      </Button>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {target ? (
        <ActionModal target={target} reason={reason} setReason={setReason} busy={busy} onConfirm={runAction} onClose={() => setTarget(null)} />
      ) : null}
      <VerifyPickupModal open={verifyOpen} onClose={() => setVerifyOpen(false)} cafeId={data.cafeId} onCollected={load} />
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-black text-coffee-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}

function ActionModal({
  target,
  reason,
  setReason,
  busy,
  onConfirm,
  onClose,
}: {
  target: TargetAction;
  reason: string;
  setReason: (s: string) => void;
  busy: boolean;
  onConfirm: (order: Order, kind: TargetAction['kind']) => Promise<void>;
  onClose: () => void;
}) {
  const info = KIND_INFO[target.kind];
  return (
    <Modal open onClose={onClose} title={`${info.label} order`}>
      <p className="text-sm text-stone-600">
        {info.label} #{target.order.order_number}? A verified payment will be refunded when cancelled.
      </p>
      {info.needsReason ? (
        <>
          <label className="label mt-3">Reason</label>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason shown to the customer" maxLength={300} />
        </>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Back
        </Button>
        <Button variant={info.needsReason ? 'danger' : 'primary'} loading={busy} onClick={() => onConfirm(target.order, target.kind)}>
          {info.label}
        </Button>
      </div>
    </Modal>
  );
}

function VerifyPickupModal({ open, onClose, cafeId, onCollected }: { open: boolean; onClose: () => void; cafeId: string; onCollected: () => void }) {
  const [token, setToken] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [canCollect, setCanCollect] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setToken('');
      setOrder(null);
      setCanCollect(false);
      setError(null);
    }
  }, [open]);

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiPost<{ order: Order; canCollect: boolean }>('/api/staff/pickup/verify', { token, cafeId });
      setOrder(res.order);
      setCanCollect(res.canCollect);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  const collect = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiPost('/api/staff/pickup/collect', { token, cafeId });
      await onCollected();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark collected');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Verify pickup token">
      <div className="grid gap-3">
        <label className="label">Token</label>
        <div className="flex gap-2">
          <input className="input uppercase" value={token} onChange={(e) => setToken(e.target.value.toUpperCase().slice(0, 10))} placeholder="MF-0000" />
          <Button variant="primary" loading={busy} onClick={verify}>
            Verify
          </Button>
        </div>
        {error ? <Alert>{error}</Alert> : null}
        {order ? (
          <div className="mt-2 rounded-lg border border-coffee-100 bg-cream-50 p-3 text-sm">
            <p className="flex items-center justify-between gap-2 font-semibold text-coffee-900">
              <span>#{order.order_number} · {order.customer_name}</span>
              <StatusBadge status={order.status} />
            </p>
            <p className="mt-1 text-stone-500">{order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</p>
            <p className="mt-1 text-xs text-stone-400">
              {PAYMENT_LABELS[order.payment_status] ?? order.payment_status} · {formatPaise(order.total_paise)}
            </p>
            {canCollect ? (
              <Button variant="accent" className="mt-3 w-full" loading={busy} onClick={collect}>
                Collect &amp; hand over
              </Button>
            ) : order.status === 'collected' ? (
              <p className="mt-3 text-xs text-amber-700">This order was already collected.</p>
            ) : (
              <p className="mt-3 text-xs text-amber-700">Order isn't ready for pickup yet (status: {order.status}).</p>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}