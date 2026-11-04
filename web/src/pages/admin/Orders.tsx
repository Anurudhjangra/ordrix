import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '../../lib/api';
import { formatDateTime, formatPaise, PAYMENT_LABELS } from '../../lib/format';
import { onSocket } from '../../lib/socket';
import { toast } from '../../lib/toast';
import { Alert, Button, EmptyState, IconQR, Loader, Modal, StatusBadge } from '../../components/ui';
import type { Order } from '../../lib/types';

interface CafeLite {
  id: string;
  name: string;
}

type ActionKind = 'accept' | 'reject' | 'preparing' | 'ready' | 'collect' | 'cancel';

const ACTION_META: Record<
  ActionKind,
  { label: string; done: string; tone: 'primary' | 'accent' | 'danger'; needsReason?: boolean }
> = {
  accept: { label: 'Accept order', done: 'Order accepted', tone: 'primary' },
  preparing: { label: 'Start preparing', done: 'Preparing started', tone: 'primary' },
  ready: { label: 'Mark ready', done: 'Marked ready for pickup', tone: 'accent' },
  collect: { label: 'Hand over', done: 'Order collected', tone: 'accent' },
  reject: { label: 'Reject', done: 'Order rejected', tone: 'danger', needsReason: true },
  cancel: { label: 'Cancel', done: 'Order cancelled', tone: 'danger', needsReason: true },
};

const NEXT_STATUS: Record<ActionKind, string> = {
  accept: 'accepted',
  preparing: 'preparing',
  ready: 'ready',
  collect: 'collected',
  reject: 'rejected',
  cancel: 'cancelled',
};

/** Columns of the live board, in service order. */
const COLUMNS: { status: string; title: string; dot: string; accent: string }[] = [
  { status: 'awaiting_acceptance', title: 'New', dot: 'bg-amber-500', accent: 'from-amber-400 to-amber-600' },
  { status: 'accepted', title: 'Accepted', dot: 'bg-sky-500', accent: 'from-sky-400 to-sky-600' },
  { status: 'preparing', title: 'Preparing', dot: 'bg-violet-500', accent: 'from-violet-400 to-violet-600' },
  { status: 'ready', title: 'Ready', dot: 'bg-green-500', accent: 'from-green-400 to-green-600' },
];

function actionsFor(status: string): ActionKind[] {
  switch (status) {
    case 'awaiting_acceptance':
      return ['accept', 'reject'];
    case 'accepted':
      return ['preparing', 'cancel'];
    case 'preparing':
      return ['ready', 'cancel'];
    case 'ready':
      return ['collect', 'cancel'];
    case 'cancellation_requested':
      return ['cancel'];
    default:
      return [];
  }
}

/** SQLite stores UTC as `YYYY-MM-DD HH:MM:SS`. */
function toDate(value: string): Date {
  return new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
}

function timeAgo(value: string): string {
  const diff = Date.now() - toDate(value).getTime();
  if (Number.isNaN(diff)) return '—';
  const mins = Math.max(0, Math.floor(diff / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [cafes, setCafes] = useState<CafeLite[]>([]);
  const [cafeId, setCafeId] = useState<string>('');
  const [view, setView] = useState<'active' | 'history'>('active');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [target, setTarget] = useState<{ order: Order; kind: ActionKind } | null>(null);
  const [reason, setReason] = useState('');
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [lastSync, setLastSync] = useState<number>(Date.now());

  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setError(null);
      try {
        const params = new URLSearchParams();
        params.set('context', view);
        if (cafeId) params.set('cafeId', cafeId);
        const res = await apiGet<{ orders: Order[]; cafes: CafeLite[] }>(`/api/admin/orders?${params.toString()}`);
        setOrders(res.orders);
        setCafes(res.cafes);
        setLastSync(Date.now());

        if (firstLoad.current) {
          res.orders.forEach((o) => knownIds.current.add(o.id));
          firstLoad.current = false;
        } else {
          const fresh = res.orders.filter((o) => !knownIds.current.has(o.id)).map((o) => o.id);
          res.orders.forEach((o) => knownIds.current.add(o.id));
          if (fresh.length) {
            setFreshIds((prev) => new Set([...prev, ...fresh]));
            window.setTimeout(() => {
              setFreshIds((prev) => {
                const next = new Set(prev);
                fresh.forEach((id) => next.delete(id));
                return next;
              });
            }, 20_000);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load orders');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [cafeId, view],
  );

  useEffect(() => {
    setLoading(true);
    firstLoad.current = true;
    knownIds.current = new Set();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cafeId, view]);

  useEffect(() => {
    const offCreated = onSocket('order:created', () => {
      toast({ tone: 'info', title: 'New order received', body: 'A new order just landed in the live queue.' });
      load(true);
    });
    const offUpdated = onSocket('order:updated', () => load(true));
    const t = window.setInterval(() => load(true), 8000);
    return () => {
      offCreated();
      offUpdated();
      window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const runAction = async (order: Order, kind: ActionKind, why?: string) => {
    setBusyId(order.id);
    setError(null);
    try {
      if (kind === 'collect') {
        if (!order.pickup_token) throw new Error('This order has no pickup code — use "Verify pickup token" instead.');
        await apiPost('/api/staff/pickup/collect', { token: order.pickup_token.token, cafeId: order.cafe_id });
      } else {
        const meta = ACTION_META[kind];
        await apiPost(
          `/api/staff/orders/${order.id}/${kind}`,
          meta.needsReason ? { reason: why?.trim() || 'Cancelled by cafe' } : {},
        );
      }
      toast({
        tone: 'success',
        title: `${ACTION_META[kind].done} · #${order.order_number}`,
        body:
          kind === 'accept'
            ? 'The student can now see "Accepted" on their tracker.'
            : kind === 'ready'
              ? 'Customer has been notified that the order is ready.'
              : undefined,
      });
      setTarget(null);
      setReason('');
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: NEXT_STATUS[kind] } : o)),
      );
      await load(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Action failed';
      setError(message);
      toast({ tone: 'error', title: 'Action failed', body: message });
    } finally {
      setBusyId(null);
    }
  };

  const filtered = orders.filter((o) =>
    search.trim()
      ? `${o.order_number} ${o.customer_name} ${o.cafe_name}`.toLowerCase().includes(search.trim().toLowerCase())
      : true,
  );

  const counts = {
    new: filtered.filter((o) => o.status === 'awaiting_acceptance' || o.status === 'cancellation_requested').length,
    prep: filtered.filter((o) => o.status === 'accepted' || o.status === 'preparing').length,
    ready: filtered.filter((o) => o.status === 'ready').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-accent-600">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500 pulse-dot text-green-500" />
            Live
          </p>
          <h2 className="font-display text-2xl font-black text-coffee-900">Order command centre</h2>
          <p className="mt-1 text-sm text-stone-500">
            New orders appear here instantly. Nothing moves until you accept it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-medium text-stone-400 sm:inline">
            synced {new Date(lastSync).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
          </span>
          <Button variant="outline" size="sm" onClick={() => load()} loading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-coffee-100 bg-white/80 p-1 shadow-sm">
          {(['active', 'history'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold capitalize transition-all duration-200 ${
                view === v ? 'bg-coffee-800 text-cream-50 shadow' : 'text-stone-500 hover:bg-coffee-50 hover:text-coffee-800'
              }`}
            >
              {v === 'active' ? 'Live queue' : 'History'}
            </button>
          ))}
        </div>

        <span className="mx-1 h-5 w-px bg-coffee-100" />

        <button
          onClick={() => setCafeId('')}
          className={`chip transition hover:-translate-y-0.5 ${cafeId === '' ? 'bg-coffee-800 text-cream-50' : ''}`}
        >
          All outlets
        </button>
        {cafes.map((c) => (
          <button
            key={c.id}
            onClick={() => setCafeId(c.id)}
            className={`chip transition hover:-translate-y-0.5 ${cafeId === c.id ? 'bg-coffee-800 text-cream-50' : ''}`}
          >
            {c.name}
          </button>
        ))}

        <div className="ml-auto w-full sm:w-64">
          <input
            className="input py-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # or customer…"
          />
        </div>
      </div>

      {view === 'active' ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <Metric label="Waiting for you" value={counts.new} hint="new orders" tone="amber" />
          <Metric label="In the kitchen" value={counts.prep} hint="accepted + preparing" tone="violet" />
          <Metric label="Ready to hand over" value={counts.ready} hint="collect now" tone="green" />
        </div>
      ) : null}

      {loading ? (
        <Loader label="Loading orders…" />
      ) : view === 'active' ? (
        filtered.length === 0 ? (
          <EmptyState
            title="No live orders"
            body="New orders will pop in here in real time. Try placing one from the student side."
          />
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => {
              const items = filtered
                .filter(
                  (o) =>
                    o.status === col.status ||
                    (col.status === 'awaiting_acceptance' && o.status === 'cancellation_requested'),
                )
                .sort((a, b) => toDate(a.created_at).getTime() - toDate(b.created_at).getTime());
              return (
                <section key={col.status} className="rounded-3xl border border-coffee-100 bg-white/55 p-3">
                  <header className="mb-3 flex items-center justify-between px-1">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-coffee-800">
                      <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                      {col.title}
                    </span>
                    <span className="badge bg-white text-stone-500">{items.length}</span>
                  </header>
                  <div className="grid gap-3">
                    {items.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-coffee-100 px-3 py-6 text-center text-xs text-stone-400">
                        Nothing here
                      </p>
                    ) : (
                      items.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          fresh={freshIds.has(order.id)}
                          busy={busyId === order.id}
                          accent={col.accent}
                          onAction={(kind) => {
                            if (ACTION_META[kind].needsReason) {
                              setReason('');
                              setTarget({ order, kind });
                            } else {
                              void runAction(order, kind);
                            }
                          }}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )
      ) : (
        <HistoryList orders={filtered} />
      )}

      {/* Reject / cancel confirmation */}
      <Modal
        open={Boolean(target)}
        onClose={() => {
          setTarget(null);
          setReason('');
        }}
        title={target ? `${ACTION_META[target.kind].label} order` : ''}
      >
        {target ? (
          <>
            <p className="text-sm text-stone-600">
              {ACTION_META[target.kind].label} <span className="font-bold text-coffee-900">#{target.order.order_number}</span>?
              A verified payment will be queued for refund.
            </p>
            <label className="label mt-4">Reason (shown to the customer)</label>
            <input
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Outlet closing early"
              maxLength={300}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setTarget(null)}>
                Back
              </Button>
              <Button
                variant="danger"
                loading={busyId === target.order.id}
                onClick={() => runAction(target.order, target.kind, reason)}
              >
                {ACTION_META[target.kind].label}
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: 'amber' | 'violet' | 'green';
}) {
  const toneClass = {
    amber: 'text-amber-700 bg-amber-50 border-amber-100',
    violet: 'text-violet-700 bg-violet-50 border-violet-100',
    green: 'text-green-700 bg-green-50 border-green-100',
  }[tone];
  return (
    <div className="flex items-center justify-between rounded-2xl border border-coffee-100 bg-white/80 px-4 py-3 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</p>
        <p className="text-[11px] text-stone-400">{hint}</p>
      </div>
      <span className={`grid h-11 min-w-[2.75rem] place-items-center rounded-xl border px-2 font-display text-xl font-black ${toneClass}`}>
        {value}
      </span>
    </div>
  );
}

function OrderCard({
  order,
  fresh,
  busy,
  accent,
  onAction,
}: {
  order: Order;
  fresh: boolean;
  busy: boolean;
  accent: string;
  onAction: (kind: ActionKind) => void;
}) {
  const actions = actionsFor(order.status);
  return (
    <article
      className={`card card-hover relative overflow-hidden !p-0 ${fresh ? 'fade-up ring-2 ring-amber-300/80' : ''}`}
    >
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-display text-lg font-black leading-none text-coffee-900">
              #{order.order_number}
              {fresh ? (
                <span className="badge animate-pulse bg-amber-100 text-[10px] font-black uppercase tracking-wide text-amber-800">
                  New
                </span>
              ) : null}
            </p>
            <p className="mt-1 truncate text-[11px] font-semibold text-stone-400">{order.cafe_name}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
          <span className="font-bold text-coffee-700">{order.customer_name}</span>
          <span className="text-stone-300">•</span>
          <span>{timeAgo(order.created_at)}</span>
          <span
            className={`badge ${
              order.payment_status === 'verified'
                ? 'bg-green-50 text-green-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {PAYMENT_LABELS[order.payment_status] ?? order.payment_status}
          </span>
        </div>

        <ul className="mt-3 grid gap-1.5 border-t border-coffee-100 pt-2.5 text-sm">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 text-coffee-800">
                <span className="font-bold text-coffee-900">{it.quantity}×</span> {it.name}
                {it.options.length ? (
                  <span className="text-stone-400"> · {it.options.map((o) => o.name).join(', ')}</span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs font-semibold text-stone-400">
                {formatPaise(it.line_total_paise)}
              </span>
            </li>
          ))}
        </ul>

        {order.customer_notes ? (
          <p className="mt-2 rounded-xl bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">“{order.customer_notes}”</p>
        ) : null}

        <div className="mt-3 flex items-center justify-between border-t border-coffee-100 pt-2.5">
          <div className="text-[11px] text-stone-400">
            <p>
              Pickup: <span className="font-semibold text-coffee-700">{order.pickup_window_label ?? 'TBA'}</span>
            </p>
            {order.pickup_token ? (
              <p className="mt-0.5 inline-flex items-center gap-1">
                <IconQR size={12} />
                <span className="font-mono font-bold tracking-wider text-coffee-800">{order.pickup_token.token}</span>
              </p>
            ) : null}
          </div>
          <span className="font-display text-base font-black text-coffee-900">{formatPaise(order.total_paise)}</span>
        </div>

        {actions.length ? (
          <div className="mt-3 grid gap-2">
            {actions.map((kind) => (
              <Button
                key={kind}
                size="sm"
                variant={ACTION_META[kind].tone}
                loading={busy}
                disabled={busy}
                onClick={() => onAction(kind)}
                className="w-full"
              >
                {ACTION_META[kind].label}
              </Button>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-coffee-50 px-2.5 py-1.5 text-center text-[11px] font-medium text-stone-500">
            Waiting for the customer to act
          </p>
        )}
      </div>
    </article>
  );
}

function HistoryList({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return <EmptyState title="No past orders" body="Collected, rejected and cancelled orders will be listed here." />;
  }
  return (
    <div className="card">
      <div className="grid gap-2">
        {orders.map((o) => (
          <div
            key={o.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-coffee-100 bg-cream-50/70 px-3.5 py-2.5"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-bold text-coffee-900">
                #{o.order_number}
                <span className="badge bg-white font-medium text-stone-500">{o.cafe_name}</span>
              </p>
              <p className="mt-0.5 text-xs text-stone-500">
                {o.customer_name} · {formatDateTime(o.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={o.status} />
              <span className="text-sm font-bold text-coffee-800">{formatPaise(o.total_paise)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
