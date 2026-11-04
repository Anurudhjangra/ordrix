import { Link } from 'react-router-dom';
import { useCart } from '../store/cart';
import { formatPaise } from '../lib/format';
import { Button, EmptyState, IconCart, IconMinus, IconPlus, SectionTitle } from '../components/ui';
import { FoodArt } from '../components/FoodArt';

export function CartPage() {
  const { lines, subtotalPaise, updateQuantity, remove, clear } = useCart();

  if (lines.length === 0) {
    return (
      <div>
        <SectionTitle title="Your cart" />
        <EmptyState
          title="Your cart is empty"
          body="Browse the menu and add something delicious to get started."
          action={
            <Link to="/menu" className="btn-accent">
              Browse the menu
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionTitle title="Your cart" subtitle="Review your selection before checkout." />
        <Button variant="danger" size="sm" onClick={clear}>
          Clear cart
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <ul className="grid gap-3">
          {lines.map((line) => (
            <li key={line.key} className="card card-hover pop-in flex items-center gap-4 p-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-coffee-100 to-cream-100 ring-gradient">
                <FoodArt name={line.name} className="h-11 w-11" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-coffee-900">{line.name}</p>
                {line.optionLabel ? <p className="truncate text-xs text-stone-500">{line.optionLabel}</p> : null}
                <p className="mt-0.5 text-xs font-medium text-coffee-500">{formatPaise(line.unitPricePaise)} each</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  className="grid h-8 w-8 place-items-center rounded-lg border border-coffee-200 bg-white text-coffee-700 transition hover:bg-coffee-50 active:translate-y-0.5"
                  onClick={() => updateQuantity(line.key, line.quantity - 1)}
                  aria-label="Decrease"
                >
                  <IconMinus size={13} />
                </button>
                <span className="w-8 text-center text-sm font-bold">{line.quantity}</span>
                <button
                  className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-b from-accent-400 to-accent-600 text-white shadow-[0_6px_14px_-8px_rgba(138,10,16,.6)] transition hover:brightness-105 active:translate-y-0.5"
                  onClick={() => updateQuantity(line.key, line.quantity + 1)}
                  aria-label="Increase"
                >
                  <IconPlus size={13} />
                </button>
              </div>
              <div className="w-24 text-right font-display text-base font-extrabold text-coffee-900">
                {formatPaise(line.unitPricePaise * line.quantity)}
              </div>
              <button
                className="grid h-8 w-8 place-items-center rounded-lg text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                onClick={() => remove(line.key)}
                aria-label="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        <aside className="card h-fit overflow-hidden p-0">
          <div className="bg-gradient-to-br from-coffee-800 to-coffee-900 px-5 py-4">
            <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-cream-50">
              <IconCart size={18} className="text-accent-400" /> Order summary
            </h3>
          </div>
          <dl className="space-y-2.5 px-5 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500">Items</dt>
              <dd className="font-semibold">{lines.reduce((n, l) => n + l.quantity, 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Subtotal</dt>
              <dd className="font-semibold">{formatPaise(subtotalPaise)}</dd>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-cream-100 px-3.5 py-3">
              <dt className="font-display text-base font-extrabold text-coffee-900">Est. total</dt>
              <dd className="font-display text-xl font-extrabold text-accent-600">{formatPaise(subtotalPaise)}</dd>
            </div>
          </dl>
          <p className="px-5 pb-1 text-[11px] leading-relaxed text-stone-400">
            Tax &amp; service fees are calculated at checkout.
          </p>
          <div className="p-5 pt-3">
            <Link to="/checkout" className="btn-accent w-full">
              Proceed to checkout
            </Link>
            <Link to="/menu" className="btn-ghost mt-2 w-full text-sm">
              ← Keep browsing
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}