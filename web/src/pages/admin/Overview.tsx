import { useEffect, useState } from 'react';
import { apiGet, apiPatch } from '../../lib/api';
import { formatCount, formatDateTime, formatPaise } from '../../lib/format';
import { Alert, Button, Input, Loader, SectionTitle } from '../../components/ui';
import { AdminOrdersPage } from './Orders';

interface Stats {
  orders: { total: number; today: number; byStatus: { status: string; c: number }[] };
  verifiedRevenuePaise: number;
  pendingRefunds: { count: number; amountPaise: number };
  users: { students: number; staff: number };
  notificationFailures: number;
  webhookEvents: number;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  is_active: number;
  created_at: string;
}

type Tab = 'stats' | 'users' | 'cafes' | 'orders' | 'refunds' | 'audit';

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('orders');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [cafes, setCafes] = useState<unknown[]>([]);
  const [refunds, setRefunds] = useState<unknown[]>([]);
  const [logs, setLogs] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const loadTab = async (t: Tab) => {
    setError(null);
    setLoading(true);
    try {
      if (t === 'stats') setStats(await apiGet<Stats>('/api/admin/stats'));
      if (t === 'users')
        setUsers((await apiGet<{ users: UserRow[] }>(`/api/admin/users?q=${encodeURIComponent(q)}${roleFilter ? `&role=${roleFilter}` : ''}`)).users);
      if (t === 'cafes') setCafes((await apiGet<{ cafes: unknown[] }>('/api/admin/cafes')).cafes);
      if (t === 'refunds') setRefunds((await apiGet<{ refunds: unknown[] }>('/api/admin/refunds')).refunds);
      if (t === 'audit') setLogs((await apiGet<{ logs: unknown[] }>('/api/admin/audit-logs?limit=150')).logs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'stats', label: 'Stats' },
    { key: 'users', label: 'Users' },
    { key: 'cafes', label: 'Cafes' },
    { key: 'orders', label: 'Orders' },
    { key: 'refunds', label: 'Refunds' },
    { key: 'audit', label: 'Audit log' },
  ];

  return (
    <div>
      <SectionTitle title="Admin console" subtitle="Platform-wide overview and moderation." />
      {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`badge ${tab === t.key ? 'bg-coffee-700 text-cream-50' : 'bg-coffee-100 text-coffee-700 hover:bg-coffee-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'orders' ? (
        <AdminOrdersPage />
      ) : loading ? (
        <Loader label="Loading…" />
      ) : (
        <>
          {tab === 'stats' && stats ? <StatsView stats={stats} /> : null}
          {tab === 'users' ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="max-w-xs" />
                <select className="input max-w-40" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="">All roles</option>
                  <option value="student">Students</option>
                  <option value="staff">Staff</option>
                  <option value="owner">Owners</option>
                  <option value="admin">Admins</option>
                </select>
                <Button variant="primary" onClick={() => loadTab('users')}>
                  Search
                </Button>
              </div>
              <UserTable users={users} onChange={() => loadTab('users')} />
            </div>
          ) : null}
          {tab === 'cafes' ? <CafeTable cafes={cafes as CafeRow[]} /> : null}
          {tab === 'refunds' ? (
            <div className="card grid gap-2">
              {(refunds as RefundRow[]).length === 0 ? (
                <p className="text-sm text-stone-500">No refunds yet.</p>
              ) : (
                (refunds as RefundRow[]).map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-coffee-100 pb-2 last:border-0">
                    <span className="text-sm">
                      #{r.order_number} · {r.customer_name} · <span className="font-mono">{r.provider_refund_id ?? '—'}</span>
                    </span>
                    <span className={`badge ${r.status === 'processed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {r.status}
                    </span>
                    <span className="font-semibold text-coffee-800">{formatPaise(r.amount_paise)}</span>
                  </div>
                ))
              )}
            </div>
          ) : null}
          {tab === 'audit' ? (
            <div className="card grid gap-1.5">
              {(logs as AuditRow[]).map((l) => (
                <div key={l.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-coffee-100 pb-1.5 text-sm last:border-0">
                  <span>
                    <span className="font-mono text-xs text-accent-600">{l.action}</span>
                    <span className="ml-2 text-stone-600">{l.actor_email ?? 'system'}</span>
                  </span>
                  <span className="text-xs text-stone-400">{formatDateTime(l.created_at)} · {l.ip ?? '—'}</span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function StatsView({ stats }: { stats: Stats }) {
  const byStatus = Object.fromEntries(stats.orders.byStatus.map((s) => [s.status, s.c]));
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Orders</p>
        <p className="mt-1 font-display text-2xl font-black text-coffee-900">{formatCount(stats.orders.total)}</p>
        <p className="mt-0.5 text-xs text-stone-500">{stats.orders.today} placed today</p>
      </div>
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Verified revenue</p>
        <p className="mt-1 font-display text-2xl font-black text-coffee-900">{formatPaise(stats.verifiedRevenuePaise)}</p>
      </div>
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Pending refunds</p>
        <p className="mt-1 font-display text-2xl font-black text-coffee-900">{formatCount(stats.pendingRefunds.count)}</p>
        <p className="mt-0.5 text-xs text-stone-500">{formatPaise(stats.pendingRefunds.amountPaise)}</p>
      </div>
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Users</p>
        <p className="mt-1 font-display text-2xl font-black text-coffee-900">{formatCount(stats.users.students + stats.users.staff)}</p>
        <p className="mt-0.5 text-xs text-stone-500">{stats.users.students} students · {stats.users.staff} staff/owners</p>
      </div>
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Order statuses</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {['awaiting_acceptance', 'accepted', 'preparing', 'ready', 'collected', 'rejected', 'cancelled'].map((s) =>
            byStatus[s] ? <span key={s} className="badge bg-coffee-100 text-coffee-700">{s.replace(/_/g, ' ')}: {byStatus[s]}</span> : null,
          )}
        </div>
      </div>
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">System</p>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-stone-500">Notification failures</dt><dd>{formatCount(stats.notificationFailures)}</dd></div>
          <div className="flex justify-between"><dt className="text-stone-500">Webhook events</dt><dd>{formatCount(stats.webhookEvents)}</dd></div>
        </dl>
      </div>
    </div>
  );
}

function UserTable({ users, onChange }: { users: UserRow[]; onChange: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const patch = async (id: string, body: { isActive?: boolean; role?: string }) => {
    setBusy(id);
    setError(null);
    try {
      await apiPatch(`/api/admin/users/${id}`, body);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  };

  if (error) { /* surfaced below */ }
  return (
    <div className="card">
      {error ? <div className="mb-3"><Alert>{error}</Alert></div> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-coffee-100 text-xs uppercase tracking-wide text-stone-400">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Joined</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-coffee-50 last:border-0">
                <td className="py-2 pr-3 font-medium text-coffee-900">{u.name}</td>
                <td className="py-2 pr-3 text-stone-600">{u.email}</td>
                <td className="py-2 pr-3">
                  <select
                    className="input max-w-28 py-1"
                    value={u.role}
                    disabled={busy === u.id}
                    onChange={(e) => patch(u.id, { role: e.target.value })}
                  >
                    <option value="student">student</option>
                    <option value="staff">staff</option>
                    <option value="owner">owner</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <span className={`badge ${u.is_active === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active === 1 ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="py-2 pr-3 text-stone-500">{formatDateTime(u.created_at)}</td>
                <td className="py-2">
                  <Button
                    size="sm"
                    variant={u.is_active === 1 ? 'outline' : 'primary'}
                    disabled={busy === u.id}
                    onClick={() => patch(u.id, { isActive: u.is_active !== 1 })}
                  >
                    {u.is_active === 1 ? 'Disable' : 'Enable'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface CafeRow {
  id: string;
  name: string;
  is_active: number;
  is_accepting_orders: number;
  order_count: number;
  member_count: number;
}

function CafeTable({ cafes }: { cafes: CafeRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const patch = async (id: string, body: { isActive?: boolean; isAcceptingOrders?: boolean }) => {
    try {
      await apiPatch(`/api/admin/cafes/${id}`, body);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };
  return (
    <div className="card">
      {error ? <div className="mb-3"><Alert>{error}</Alert></div> : null}
      <div className="grid gap-2">
        {cafes.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-coffee-100 py-2 last:border-0">
            <div>
              <p className="font-semibold text-coffee-900">{c.name}</p>
              <p className="text-xs text-stone-500">
                {c.order_count} orders · {c.member_count} staff members
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={c.is_accepting_orders === 1 ? 'outline' : 'primary'}
                onClick={() => patch(c.id, { isAcceptingOrders: c.is_accepting_orders !== 1 })}
              >
                {c.is_accepting_orders === 1 ? 'Pause orders' : 'Accept orders'}
              </Button>
              {c.is_active === 1 ? (
                <Button size="sm" variant="danger" onClick={() => patch(c.id, { isActive: false })}>
                  Deactivate
                </Button>
              ) : (
                <Button size="sm" variant="primary" onClick={() => patch(c.id, { isActive: true })}>
                  Activate
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RefundRow {
  id: string;
  order_number: string;
  customer_name: string;
  provider_refund_id: string | null;
  status: string;
  amount_paise: number;
}

interface AuditRow {
  id: string;
  action: string;
  actor_email: string | null;
  ip: string | null;
  created_at: string;
}