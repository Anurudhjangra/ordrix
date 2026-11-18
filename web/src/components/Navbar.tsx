import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useCart } from '../store/cart';
import { apiGet, apiPost } from '../lib/api';
import { onSocket } from '../lib/socket';
import { toast, Toaster } from '../lib/toast';
import { useEffect, useState } from 'react';
import { IconBell, IconCart, IconCup, IconLogout } from './ui';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: number;
  created_at: string;
  order_id?: string | null;
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${
    isActive
      ? 'bg-gradient-to-b from-accent-400 to-accent-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_8px_18px_-8px_rgba(138,10,16,.6)]'
      : 'text-cream-100/80 hover:bg-white/10 hover:text-white'
  }`;

export function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const loadNotices = async () => {
    if (!user) return;
    try {
      const res = await apiGet<{ notifications: NotificationItem[]; unread: number }>('/api/notifications');
      setNotifications(res.notifications.slice(0, 20));
      setUnread(res.unread);
    } catch {
      // Ignore transient failures.
    }
  };

  useEffect(() => {
    loadNotices();
    const t = setInterval(loadNotices, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!noticeOpen) return;
    const t = setInterval(loadNotices, 2000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noticeOpen]);

  // Live notifications over the socket so users see status changes instantly.
  useEffect(() => {
    if (!user) return;
    const off = onSocket<NotificationItem>('notification:new', (n) => {
      setNotifications((prev) => [n, ...prev].slice(0, 20));
      setUnread((u) => u + 1);
      const ready = n.type === 'order_ready';
      toast({
        title: n.title,
        body: n.body ?? undefined,
        tone: ready ? 'success' : n.type === 'order_rejected' || n.type === 'order_cancelled' ? 'error' : 'info',
        href: n.order_id ? `/orders/${n.order_id}` : undefined,
        actionLabel: n.order_id ? 'Track order' : undefined,
      });
    });
    return off;
  }, [user]);

  const markAllRead = async () => {
    try {
      await apiPost('/api/notifications/read-all', {});
      setUnread(0);
      setNotifications((n) => n.map((x) => ({ ...x, is_read: 1 })));
    } catch {
      // ignore
    }
  };

  const navLinks = (
    <>
      <NavLink to="/" end className={linkClass}>
        Home
      </NavLink>
      <NavLink to="/menu" className={linkClass}>
        Menu
      </NavLink>
      {user ? (
        <NavLink to="/orders" className={linkClass}>
          Orders
        </NavLink>
      ) : null}
      {user?.role === 'owner' || user?.role === 'staff' ? (
        <NavLink to="/staff" className={linkClass}>
          Dashboard
        </NavLink>
      ) : null}
      {user?.role === 'admin' ? (
        <NavLink to="/admin" className={linkClass}>
          Admin Orders
        </NavLink>
      ) : null}
    </>
  );

  return (
    <header className="glass-dark sticky top-0 z-40">
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-accent-500 to-transparent" />

      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        {/* Brand */}
        <NavLink to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="relative">
            <span className="absolute inset-0 rounded-xl bg-accent-400/45 blur-md" />
            <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-white p-1 shadow-[0_8px_18px_-8px_rgba(0,0,0,.7)] ring-1 ring-white/40">
              <img src="/brand/ordrix-mark.svg" alt="ORDRIX" className="h-full w-full object-contain" />
            </span>
          </span>
          <span className="leading-none">
            <span className="block font-display text-lg font-extrabold text-white">
              <span className="text-gradient">ORDRIX</span>
            </span>
            <span className="mt-1 hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-cream-100/50 sm:block">
              MDU · Pre-Order
            </span>
          </span>
        </NavLink>

        {/* Desktop nav */}
        <nav className="ml-4 hidden items-center gap-1 lg:flex">{navLinks}</nav>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1.5">
          {user ? (
            <>
              <button
                className="relative grid h-10 w-10 place-items-center rounded-full text-cream-100/80 transition hover:bg-white/10 hover:text-white"
                onClick={() => setNoticeOpen((v) => !v)}
                aria-label="Notifications"
              >
                <IconBell size={19} />
                {unread > 0 ? (
                  <span className="pop-in absolute right-1 top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white shadow">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
              </button>

              <NavLink
                to="/cart"
                className="relative flex items-center gap-2 rounded-full bg-gradient-to-b from-accent-400 to-accent-600 px-4 py-2.5 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.3),0_10px_22px_-10px_rgba(138,10,16,.65)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5"
              >
                <IconCart size={18} />
                <span className="hidden sm:inline">Cart</span>
                {count > 0 ? (
                  <span className="pop-in grid h-5 min-w-[20px] place-items-center rounded-full bg-coffee-900 px-1.5 text-[11px] font-extrabold text-cream-50">
                    {count}
                  </span>
                ) : null}
              </NavLink>

              <button
                className="hidden h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-cream-100/85 transition hover:bg-white/10 hover:text-white md:flex"
                onClick={() => navigate('/profile')}
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-b from-coffee-400 to-coffee-700 text-xs font-extrabold uppercase text-cream-50 ring-1 ring-white/15">
                  {user.name.charAt(0)}
                </span>
                <span className="max-w-[7rem] truncate">{user.name.split(' ')[0]}</span>
              </button>

              <button
                className="grid h-10 w-10 place-items-center rounded-full text-cream-100/70 transition hover:bg-red-500/15 hover:text-red-300"
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
                aria-label="Sign out"
              >
                <IconLogout size={18} />
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-cream-100/85 transition hover:bg-white/10 hover:text-white sm:block">
                Sign in
              </NavLink>
              <NavLink to="/register" className="btn-accent btn-sm">
                Create account
              </NavLink>
            </>
          )}
        </div>
      </div>

      {/* Mobile nav row */}
      <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navLinks}
        {user ? (
          <NavLink to="/profile" className={linkClass}>
            Profile
          </NavLink>
        ) : null}
      </nav>

      {/* Notifications panel */}
      {noticeOpen ? (
        <div className="border-t border-white/10 bg-coffee-900/95 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold text-cream-100">
                <IconBell size={16} className="text-accent-400" /> Notifications
                {unread > 0 ? <span className="badge bg-accent-500 text-white">{unread} new</span> : null}
              </span>
              <button className="text-xs font-semibold text-cream-100/60 transition hover:text-accent-400" onClick={markAllRead}>
                Mark all read
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-cream-100/60">Nothing here yet.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`flex items-start gap-3 rounded-xl px-3.5 py-2.5 text-sm ${
                      n.is_read ? 'bg-white/5 text-cream-100/70' : 'bg-gradient-to-r from-white/10 to-white/5 text-white'
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-2.5 w-2.5 shrink-0 place-items-center rounded-full ${
                        n.is_read ? 'bg-coffee-400' : 'pulse-dot bg-accent-500'
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold">{n.title}</span>
                      {n.body ? <span className="block text-cream-100/60">{n.body}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      {loading ? (
        <div className="grid flex-1 place-items-center text-coffee-600">
          <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      ) : (
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      )}
      <footer className="relative mt-16 border-t border-coffee-100/80 bg-gradient-to-b from-cream-50/80 to-white">
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-accent-500/70 to-transparent" />
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5">
                <span className="relative">
                  <span className="absolute inset-0 rounded-xl bg-accent-400/30 blur-md" />
                  <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-coffee-100">
                    <img src="/brand/ordrix-mark.svg" alt="ORDRIX" className="h-full w-full object-contain" />
                  </span>
                </span>
                <div>
                  <p className="font-display text-xl font-black text-coffee-900">
                    <span className="text-gradient">ORDRIX</span>
                  </p>
                  <p className="text-xs text-stone-500">Freshly Brewed • Made With Love</p>
                </div>
              </div>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-600">
                Campus pre-ordering made easy. Skip the long queues at MDU, Rohtak — order your favourite coffee, meals & snacks right from your phone and collect between classes.
              </p>
              <p className="mt-4 text-sm font-semibold text-coffee-700">Order in class · Collect between classes</p>
            </div>

            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-wider text-coffee-900">Quick Links</p>
              <ul className="grid gap-2 text-sm text-stone-600">
                <li>
                  <a href="/menu" className="transition-colors hover:text-accent-600">Our Menu</a>
                </li>
                <li>
                  <a href="/orders" className="transition-colors hover:text-accent-600">My Orders</a>
                </li>
                <li>
                  <a href="/cart" className="transition-colors hover:text-accent-600">Cart</a>
                </li>
                <li>
                  <a href="/profile" className="transition-colors hover:text-accent-600">My Profile</a>
                </li>
              </ul>
            </div>

            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-wider text-coffee-900">Contact & Location</p>
              <ul className="grid gap-2.5 text-sm text-stone-600">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-accent-500">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  </span>
                  <span>Near MDU, Rohtak<br />Haryana, India</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent-500">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </span>
                  <span>+91 XXXXX XXXXX</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent-500">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </span>
                  <span>hello@ordrix.test</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-coffee-100 pt-6 text-xs text-stone-400 sm:flex-row">
            <p className="flex items-center gap-1.5">
              <IconCup size={13} className="text-accent-500" />
              © {new Date().getFullYear()} <span className="font-semibold text-coffee-600">ORDRIX</span>. All rights reserved.
            </p>
            <p className="text-center sm:text-right">
              Designed &amp; Developed by <span className="font-semibold text-coffee-600">Anirudh</span>, <span className="font-semibold text-coffee-600">Tushar</span> &amp; <span className="font-semibold text-coffee-600">Sagar</span> | Made with <span className="text-accent-500">♥</span> for MDU Students
            </p>
          </div>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}