import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';
import type { CafeIndexRow } from '../lib/types';
import { FoodArt } from '../components/FoodArt';
import { IconArrowRight, IconBag, IconCup, IconFlame, IconQR, IconSparkle } from '../components/ui';

const POPULAR = [
  'Cold Coffee',
  'Cheese Garlic Bread',
  'Farm Veggie Pizza',
  'Grilled Sandwich',
  'Dynamite Paneer Burger',
  'Peri Peri Fries',
  'Paneer Wrap',
  'Cheese Maggi',
  'Chilli Potato',
];

export function HomePage() {
  const [cafes, setCafes] = useState<CafeIndexRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ cafes: CafeIndexRow[] }>('/api/cafes')
      .then((res) => setCafes(res.cafes))
      .catch((e: Error) => setError(e.message));
  }, []);

  const anyOpen = cafes.some((c) => c.status.acceptingOrders);

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-coffee-900 via-coffee-800 to-coffee-900" />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent-500/25 blur-3xl" />
        <div className="absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-coffee-500/40 blur-3xl" />
        <div className="absolute right-10 top-10 hidden h-24 w-24 rounded-full ring-2 ring-accent-400/30 lg:block" />
        <div className="absolute bottom-8 right-1/3 hidden h-14 w-14 rounded-2xl bg-accent-500/20 lg:block" />

        <div className="relative mx-auto grid max-w-5xl gap-10 px-6 py-14 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-accent-300 backdrop-blur">
              <IconFlame size={13} className="text-accent-400" />
              Maharshi Dayanand University · Rohtak
            </span>
            <h1 className="mt-6 font-display text-4xl font-black leading-[1.08] text-cream-50 sm:text-5xl lg:text-[3.4rem]">
              Skip the queue.
              <br />
              Order in class, <span className="text-gradient-animated">collect between classes.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-coffee-200 sm:text-lg">
              Pre-order frappes, coffee and snacks from Cafe My Frappe, pay online in sandbox, and grab
              your order with a single <span className="font-semibold text-cream-50">pickup code</span> — no
              line, no wait, no rush.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#outlets" className="btn-accent btn-lg btn-hero">
                <IconCup size={18} />
                Order now
              </a>
              <a
                href="#how"
                className="btn-outline btn-lg btn-hero border-white/20 bg-white/5 text-cream-50 backdrop-blur"
              >
                How it works
              </a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-8 gap-y-3">
              <HeroStat value="5+" label="minutes to order" />
              <HeroStat value="1" label="pickup code, zero queue" />
              <HeroStat value="100%" label="campus-fresh, made to order" />
            </div>
          </div>

          {/* Floating cup card */}
          <div className="relative hidden lg:block">
            <div className="float-slow relative mx-auto w-64">
              <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/15 to-white/5 p-8 shadow-[0_30px_70px_-20px_rgba(0,0,0,.6)] backdrop-blur-md">
                <div className="relative flex h-40 items-center justify-center">
                  <div className="absolute h-24 w-24 rounded-full bg-accent-500/30 blur-2xl" />
                  <div className="grid h-32 w-32 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-coffee-600 to-coffee-800 shadow-[inset_0_2px_6px_rgba(255,255,255,.2),0_16px_30px_-12px_rgba(0,0,0,.55)] ring-2 ring-white/20">
                    <img src="/menu/cold-coffee.png" alt="Cold Coffee" className="h-full w-full object-cover" />
                  </div>
                  <div className="absolute -top-2 flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="steam h-3 w-1 rounded-full bg-cream-50/50"
                        style={{ animationDelay: `${i * 0.8}s` }}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-4 text-center font-display text-lg font-bold text-cream-50">Cold Coffee</p>
                <p className="text-center text-xs font-medium uppercase tracking-widest text-accent-300">~ 4 min prep</p>
              </div>
              {/* mini order chip */}
              <div className="card-hover absolute -right-8 top-8 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-2xl">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-green-100 text-green-700">
                  <IconQR size={18} />
                </span>
                <span className="text-xs">
                  <span className="block font-bold text-coffee-900">MF-0427</span>
                  <span className="text-stone-500">Ready to collect</span>
                </span>
              </div>
              <div className="card-hover absolute -left-6 bottom-4 flex items-center gap-2 rounded-2xl bg-white p-3 shadow-2xl">
                <span className="pulse-dot grid h-2.5 w-2.5 place-items-center rounded-full bg-green-500" />
                <span className="text-xs font-bold text-coffee-800">Accepting orders</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Popular strip ---------- */}
      <section className="mt-8">
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between px-5 pt-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-accent-600">
              <IconFlame size={14} className="text-accent-500" /> Popular right now
            </p>
            <Link to="/menu" className="text-xs font-bold text-coffee-600 transition hover:text-accent-600">
              See all →
            </Link>
          </div>
          <div className="relative mt-3 overflow-hidden pb-5">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent" />
            <div className="marquee-track gap-4 px-4">
              {[...POPULAR, ...POPULAR].map((name, i) => (
                <Link
                  to="/menu"
                  key={`${name}-${i}`}
                  className="hover-raise flex w-44 shrink-0 items-center gap-3 rounded-2xl border border-coffee-100 bg-cream-50/70 p-3"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-white to-cream-100 shadow-inner">
                    <FoodArt name={name} className="h-9 w-9" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-coffee-900">{name}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-accent-600">Bestseller</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="mt-14">
        <SectionHeading eyebrow="How it works" title="Three steps. Zero waiting." />
        <div className="stagger grid gap-4 sm:grid-cols-3">
          <HowStep
            icon={<IconCup size={22} />}
            step="01"
            title="Order in class"
            body="Browse the live menu, customise your frappe, pick a pickup window and pay online."
          />
          <HowStep
            icon={<IconFlame size={22} />}
            step="02"
            title="We prep while you study"
            body="The cafe accepts your order in real time and starts making it before your window."
          />
          <HowStep
            icon={<IconQR size={22} />}
            step="03"
            title="Show your pickup code"
            body="Walk up, show the code, take your order. Collected in seconds — code verified at the counter."
          />
        </div>
      </section>

      {/* ---------- Cafes / Outlets ---------- */}
      <section id="outlets" className="mt-14">
        <SectionHeading eyebrow={anyOpen ? 'Open right now' : 'Outlets'} title="Choose your outlet" />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {cafes.length === 0 ? (
          <p className="text-sm text-stone-500">No outlets are available right now. Check back soon.</p>
        ) : (
          <div className="stagger grid gap-5 sm:grid-cols-2">
            {cafes.map((cafe, i) => (
              <CafeCard key={cafe.id} cafe={cafe} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ---------- CTA banner ---------- */}
      <section className="card mt-14 overflow-hidden p-0">
        <div className="relative rounded-2xl bg-gradient-to-br from-coffee-800 to-coffee-900 px-6 py-10 text-center sm:px-10">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-500/20 blur-2xl" />
          <IconSparkle size={28} className="mx-auto text-accent-400" />
          <h3 className="mt-3 font-display text-2xl font-extrabold text-cream-50">
            Hungry between classes?
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-coffee-200">
            Give it a spin — place a sandbox order now and see your live tracking in action.
          </p>
          <Link to="/menu" className="btn-accent mt-5">
            Start an order <IconArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-2xl font-black text-accent-300">{value}</p>
      <p className="text-xs font-medium uppercase tracking-wider text-coffee-300">{label}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent-600">{eyebrow}</p>
      <h2 className="mt-1 font-display text-2xl font-extrabold text-coffee-900 sm:text-3xl">{title}</h2>
    </div>
  );
}

function HowStep({ icon, step, title, body }: { icon: React.ReactNode; step: string; title: string; body: string }) {
  return (
    <div className="card card-hover relative p-6">
      <span className="absolute right-5 top-4 font-display text-4xl font-black text-coffee-900/10">{step}</span>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 text-white shadow-[0_10px_20px_-8px_rgba(138,10,16,.6)]">
        {icon}
      </span>
      <h3 className="mt-4 font-display text-lg font-bold text-coffee-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{body}</p>
    </div>
  );
}

const CAFE_GRADIENTS = [
  'from-coffee-500 via-coffee-600 to-coffee-800',
  'from-accent-400 via-accent-500 to-accent-600',
];

function CafeCard({ cafe, index }: { cafe: CafeIndexRow; index: number }) {
  const g = CAFE_GRADIENTS[index % CAFE_GRADIENTS.length];
  return (
    <Link to={`/menu?cafe=${cafe.id}`} className="card card-hover group flex flex-col overflow-hidden p-0">
      <div className={`relative flex h-28 items-center justify-between bg-gradient-to-br ${g} px-6`}>
        <div className="absolute inset-0 bg-[radial-gradient(120px_80px_at_85%_20%,rgba(255,255,255,.25),transparent)]" />
        <div className="relative">
          <h3 className="font-display text-2xl font-extrabold text-white drop-shadow">{cafe.name}</h3>
          {cafe.tagline ? <p className="mt-0.5 text-xs font-medium text-white/75">{cafe.tagline}</p> : null}
        </div>
        <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-white/15 text-white backdrop-blur-sm">
          <IconBag size={26} />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        {cafe.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-stone-600">{cafe.description}</p>
        ) : null}
        <div className="mt-4 flex items-center justify-between">
          {cafe.status.acceptingOrders ? (
            <span className="badge bg-green-100 text-green-800">
              <span className="pulse-dot grid h-2 w-2 place-items-center rounded-full bg-green-500" />
              Accepting orders
            </span>
          ) : (
            <span className="badge bg-red-100 text-red-700">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              {cafe.status.reason ?? 'Closed'}
            </span>
          )}
          <span className="flex items-center gap-1 text-sm font-bold text-accent-600 transition group-hover:gap-2">
            Browse menu <IconArrowRight size={15} />
          </span>
        </div>
      </div>
    </Link>
  );
}