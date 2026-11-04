import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { useCart } from '../store/cart';
import { formatPaise } from '../lib/format';
import { Button, IconArrowRight, IconCart, IconMinus, IconPlus, Loader, Modal, SectionTitle } from '../components/ui';
import { FoodArt } from '../components/FoodArt';
import type { Cafe, CafeStatus, MenuCategory, MenuItem, MenuOption } from '../lib/types';

interface MenuProduct {
  cafeId: string;
  item: MenuItem;
  options: MenuOption[];
}

function gradientFor(name: string) {
  const palettes = [
    'from-accent-100 via-cream-100 to-cream-50',
    'from-gold-100 via-cream-100 to-cream-50',
    'from-coffee-100 via-cream-100 to-cream-50',
    'from-green-100 via-cream-50 to-cream-50',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 33 + name.charCodeAt(i)) | 0;
  return palettes[Math.abs(h) % palettes.length];
}

export function MenuPage() {
  const [searchParams] = useSearchParams();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [status, setStatus] = useState<CafeStatus | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [options, setOptions] = useState<MenuOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState<MenuProduct | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<{ cafes: Cafe[] }>('/api/cafes');
        setCafes(res.cafes);
        if (res.cafes.length) {
          const wanted = searchParams.get('cafe');
          const match = wanted ? res.cafes.find((c) => c.id === wanted) : undefined;
          setCafe(match ?? res.cafes[0]);
        }
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  useEffect(() => {
    if (!cafe) return;
    setLoading(true);
    (async () => {
      try {
        const [c, menu] = await Promise.all([
          apiGet<{ cafe: Cafe; status: CafeStatus }>(`/api/cafes/${cafe.id}`),
          apiGet<{ categories: MenuCategory[]; items: MenuItem[]; options: MenuOption[] }>(`/api/cafes/${cafe.id}/menu`),
        ]);
        setStatus(c.status);
        setCategories(menu.categories);
        setItems(menu.items);
        setOptions(menu.options);
        setActiveTab(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [cafe]);

  const grouped = useMemo(
    () => categories.map((cat) => ({ cat, items: items.filter((i) => i.category_id === cat.id) })).filter((g) => g.items.length > 0),
    [categories, items],
  );

  const scrollTo = (catId: string) => {
    setActiveTab(catId);
    document.getElementById(`cat-${catId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (loading) return <Loader label="Brewing the menu…" />;

  return (
    <div className="pb-24">
      <SectionTitle
        title={cafe?.name ?? 'Menu'}
        subtitle={status?.acceptingOrders ? 'Now accepting orders — order in class, collect between classes' : (status?.reason ?? '')}
      />

      {/* Cafe selector */}
      {cafes.length > 1 ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {cafes.map((c) => (
            <button
              key={c.id}
              onClick={() => setCafe(c)}
              className={`badge shadow-sm transition ${
                cafe?.id === c.id
                  ? 'bg-gradient-to-b from-coffee-600 to-coffee-800 text-cream-50 shadow-[0_8px_18px_-8px_rgba(70,50,35,.6)]'
                  : 'bg-white text-coffee-700 hover:bg-coffee-100'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      ) : null}

      {!status?.acceptingOrders ? (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This cafe isn't accepting orders right now{status?.reason ? ` (${status.reason})` : ''}. You can still browse.
        </div>
      ) : null}

      {/* Sticky category tabs */}
      {grouped.length > 1 ? (
        <div className="sticky top-[104px] z-30 -mx-4 mb-6 bg-[linear-gradient(180deg,#fbf6ee_60%,rgba(251,246,238,0))] px-4 pb-3 backdrop-blur">
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {grouped.map(({ cat }) => (
              <button
                key={cat.id}
                onClick={() => scrollTo(cat.id)}
                className={`badge shrink-0 px-4 py-2 transition ${
                  activeTab === cat.id
                    ? 'bg-gradient-to-b from-accent-400 to-accent-600 text-white shadow-[0_8px_18px_-8px_rgba(138,10,16,.6)]'
                    : 'border border-coffee-200/70 bg-white text-coffee-700 hover:bg-coffee-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {grouped.length === 0 ? (
        <p className="text-sm text-stone-500">The menu is being finalised — check back in a bit.</p>
      ) : (
        <div className="grid gap-10">
          {grouped.map(({ cat, items: catItems }) => (
            <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-40">
              <div className="mb-4 flex items-center gap-3">
                <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-accent-400 to-accent-600 shadow-[0_6px_14px_-6px_rgba(138,10,16,.6)]" />
                <h2 className="font-display text-2xl font-extrabold text-coffee-900">{cat.name}</h2>
                <span className="rounded-full bg-gradient-to-b from-coffee-100 to-cream-100 px-2.5 py-0.5 text-xs font-bold text-coffee-600 ring-1 ring-coffee-200/60">
                  {catItems.length}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {catItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    cafeId={cafe!.id}
                    item={item}
                    options={options.filter((o) => o.menu_item_id === item.id)}
                    accepting={Boolean(status?.acceptingOrders)}
                    onCustomise={() => setPicker({ cafeId: cafe!.id, item, options: options.filter((o) => o.menu_item_id === item.id) })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {picker ? <PickerModal product={picker} onClose={() => setPicker(null)} /> : null}
      <FloatingCartBar />
    </div>
  );
}

function ItemCard({
  cafeId,
  item,
  options,
  accepting,
  onCustomise,
}: {
  cafeId: string;
  item: MenuItem;
  options: MenuOption[];
  accepting: boolean;
  onCustomise: () => void;
}) {
  const { add } = useCart();
  const soldOut = !item.is_available;

  const quickAdd = () =>
    add({
      menuItemId: item.id,
      cafeId,
      name: item.name,
      unitPricePaise: item.price_paise,
      quantity: 1,
      optionIds: [],
      optionLabel: null,
    });

  return (
    <div className="card card-hover group flex flex-col overflow-hidden p-0">
      {/* Food image */}
      <button
        type="button"
        className={`relative flex h-44 items-center justify-center overflow-hidden rounded-t-3xl bg-gradient-to-br ${gradientFor(item.name)}`}
        onClick={soldOut ? undefined : onCustomise}
        disabled={soldOut}
      >
        <div className="absolute inset-0 bg-[radial-gradient(150px_90px_at_75%_20%,rgba(255,255,255,.55),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/75 to-transparent" />
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            className="relative h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <FoodArt
            name={item.name}
            className="relative h-32 w-32 drop-shadow-[0_18px_24px_rgba(58,20,37,.24)] transition duration-500 group-hover:scale-110 group-hover:-rotate-3"
          />
        )}
        {/* glossy shine on hover */}
        <span className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 transition-all duration-700 group-hover:left-[130%] group-hover:opacity-100" />

        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/85 px-2.5 py-1 text-[11px] font-bold text-coffee-700 shadow-sm backdrop-blur">
          <IconClockDot className="text-coffee-500" /> {item.prep_minutes} min
        </span>
        <span
          title="Pure veg"
          className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-lg border-2 border-green-600 bg-white/90 shadow-sm"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
        </span>
        {soldOut ? (
          <span className="absolute inset-0 grid place-items-center bg-white/65 backdrop-blur-[2px]">
            <span className="badge bg-coffee-900 text-cream-50 shadow-lg">Sold out</span>
          </span>
        ) : null}
      </button>

      {/* Body */}
      <div className="flex flex-1 flex-col px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-coffee-900">{item.name}</h3>
            {item.description ? <p className="mt-1 line-clamp-2 text-sm text-stone-500">{item.description}</p> : null}
          </div>
          <p className="shrink-0 font-display text-lg font-extrabold text-coffee-800">{formatPaise(item.price_paise)}</p>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-4">
          {soldOut ? (
            <span className="text-xs font-semibold text-stone-400">Back soon</span>
          ) : accepting ? (
            <>
              <Button variant="outline" size="sm" className="flex-1" onClick={onCustomise}>
                {options.length ? 'Customise' : 'Customise + Add'}
              </Button>
              <button
                onClick={quickAdd}
                title={options.length ? 'Quick add (no customisation)' : 'Add to cart'}
                className="btn-accent grid h-9 w-9 place-items-center rounded-xl p-0"
              >
                <IconPlus size={16} />
              </button>
            </>
          ) : (
            <span className="text-xs font-semibold text-stone-400">Cafe paused — menu visible</span>
          )}
        </div>
      </div>
    </div>
  );
}

function FloatingCartBar() {
  const { count, subtotalPaise } = useCart();
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 px-4">
      <Link
        to="/cart"
        className="glass-dark pop-in mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl px-5 py-3.5 text-cream-50 shadow-[0_20px_50px_-15px_rgba(51,37,26,.6)] transition hover:-translate-y-0.5"
      >
        <span className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-b from-accent-400 to-accent-600 text-white">
            <IconCart size={17} />
          </span>
          <span className="text-sm">
            <span className="block font-bold">{count} item{count > 1 ? 's' : ''} in cart</span>
            <span className="text-[11px] uppercase tracking-wider text-coffee-300">Subtotal {formatPaise(subtotalPaise)}</span>
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-sm font-bold text-accent-300">
          View cart <IconArrowRight size={15} />
        </span>
      </Link>
    </div>
  );
}

function IconClockDot({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function PickerModal({ product, onClose }: { product: MenuProduct; onClose: () => void }) {
  const { add } = useCart();
  const { cafeId, item, options } = product;

  const groups = useMemo(() => {
    const map = new Map<string, MenuOption[]>();
    for (const o of options) {
      if (!map.has(o.group_name)) map.set(o.group_name, []);
      map.get(o.group_name)!.push(o);
    }
    return [...map.entries()];
  }, [options]);

  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const chosen = options.filter((o) => selected[o.group_name]?.has(o.id));
  const unitPrice = item.price_paise + chosen.reduce((n, o) => n + o.price_delta_paise, 0);

  const toggle = (group: string, optionId: string) => {
    setSelected((prev) => {
      const next = new Set(prev[group] ?? []);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return { ...prev, [group]: next };
    });
  };

  const addToCart = () => {
    if (note.trim() && note.trim().length > 300) {
      setError('Note must be under 300 characters.');
      return;
    }
    add({
      menuItemId: item.id,
      cafeId,
      name: item.name,
      unitPricePaise: unitPrice,
      quantity,
      optionIds: chosen.map((o) => o.id),
      optionLabel: chosen.length ? chosen.map((o) => o.name).join(', ') : null,
    });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={item.name}>
      {/* Product banner */}
      <div
        className={`-mx-6 -mt-1 flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br ${gradientFor(item.name)}`}
      >
        <div className="absolute h-32 w-32 rounded-full bg-white/50 blur-2xl" />
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <FoodArt
            name={item.name}
            className="pop-in relative h-32 w-32 drop-shadow-[0_18px_22px_rgba(58,20,37,.3)]"
          />
        )}
      </div>

      <div className="mt-5 grid gap-4">
        {groups.map(([group, opts]) => (
          <div key={group}>
            <div className="label">{group}</div>
            <div className="grid gap-2">
              {opts.map((o) => {
                const on = Boolean(selected[group]?.has(o.id));
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggle(group, o.id)}
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition-all duration-150 ${
                      on
                        ? 'border-accent-500 bg-gradient-to-r from-accent-50 to-cream-50 text-coffee-900 shadow-[0_6px_14px_-8px_rgba(138,10,16,.45)]'
                        : 'border-coffee-200 bg-white text-stone-600 hover:border-coffee-300 hover:bg-coffee-50/50'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-md border-2 transition ${
                          on ? 'border-accent-500 bg-accent-500 text-white' : 'border-coffee-300 bg-white'
                        }`}
                      >
                        {on ? (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        ) : null}
                      </span>
                      {o.name}
                    </span>
                    {o.price_delta_paise !== 0 ? (
                      <span className={`text-xs font-semibold ${o.price_delta_paise > 0 ? 'text-stone-500' : 'text-green-700'}`}>
                        {o.price_delta_paise > 0 ? '+' : ''}
                        {formatPaise(o.price_delta_paise)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <div className="label">Quantity</div>
          <div className="flex items-center gap-3">
            <button
              className="grid h-10 w-10 place-items-center rounded-xl border border-coffee-200 bg-white text-coffee-700 shadow-sm transition hover:bg-coffee-50 active:translate-y-0.5"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease"
            >
              <IconMinus size={15} />
            </button>
            <span className="w-10 text-center font-display text-lg font-extrabold text-coffee-900">{quantity}</span>
            <button
              className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-b from-accent-400 to-accent-600 text-white shadow-[0_8px_18px_-8px_rgba(138,10,16,.6)] transition hover:brightness-105 active:translate-y-0.5"
              onClick={() => setQuantity((q) => Math.min(50, q + 1))}
              aria-label="Increase"
            >
              <IconPlus size={15} />
            </button>
          </div>
        </div>

        <div>
          <div className="label">Note for the cafe (optional)</div>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. extra ice, less sugar" />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Total</p>
            <p className="font-display text-xl font-extrabold text-coffee-900">{formatPaise(unitPrice * quantity)}</p>
          </div>
          <Button variant="accent" size="lg" onClick={addToCart}>
            <IconCart size={17} /> Add to cart · {quantity}
          </Button>
        </div>
      </div>
    </Modal>
  );
}