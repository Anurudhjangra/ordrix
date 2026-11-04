import { AdminOrdersPage } from './Orders';
import { Link } from 'react-router-dom';
import { IconArrowRight } from '../../components/ui';

export function AdminLiveOrdersPage() {
  return (
    <div className="-mx-4 -my-8 sm:-mx-6 sm:-my-10">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-accent-600">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500 pulse-dot text-green-500" />
              Admin · Live Orders
            </p>
            <h1 className="font-display text-3xl font-black text-coffee-900 sm:text-4xl">Incoming Orders</h1>
            <p className="mt-1 text-sm text-stone-500">
              User order place karega to yahin turant dikhega. Accept tabhi kare jab ready ho.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link to="/admin" className="btn-outline btn-sm">
              Console (Users / Cafes / Stats)
            </Link>
            <Link to="/staff" className="btn-ghost btn-sm">
              Staff dashboard
            </Link>
          </nav>
        </header>
        <AdminOrdersPage />
      </div>
    </div>
  );
}
