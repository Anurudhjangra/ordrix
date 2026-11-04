import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { formatDateTime, formatPaise, PAYMENT_LABELS } from '../lib/format';
import { EmptyState, IconClock, Loader, SectionTitle, StatusBadge } from '../components/ui';
import type { Order } from '../lib/types';

const ACTIVE = ['awaiting_acceptance', 'accepted', 'preparing'];

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      apiGet<{ orders: Order[] }>('/api/orders')
        .then((res) => setOrders(res.orders))
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <Loader label="Loading your orders…" />;

  return (
    <div>
      <SectionTitle title="Your orders" subtitle="Track every order from placement to pickup." />
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          body="When you place an order it will show up here with live tracking."
          action={
            <Link to="/menu" className="btn-accent">
              Order something
            </Link>
          }
        />
      ) : (
        <ul className="stagger grid gap-3">
          {orders.map((order) => {
            const active = ACTIVE.includes(order.status);
            return (
              <li key={order.id}>
                <Link to={`/orders/${order.id}`} className="card card-hover block p-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg font-bold text-coffee-900">#{order.order_number}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="mt-1 text-sm text-stone-500">
                        {order.cafe_name} · {order.pickup_window_label ?? 'Pickup window TBA'}
                      </p>
                      {active ? (
                        <span className="chip mt-2">
                          <IconClock size={13} className="text-accent-500" />
                          {order.eta_minutes > 0 ? `~${order.eta_minutes} min` : 'Order received'}
                          <span className="text-coffee-400">·</span>
                          {order.orders_ahead === 0 ? 'Next up' : `#${order.queue_position} in queue`}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-coffee-800">{formatPaise(order.total_paise)}</p>
                      <p className="text-xs text-stone-500">
                        {formatDateTime(order.created_at)} · {PAYMENT_LABELS[order.payment_status] ?? order.payment_status}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}