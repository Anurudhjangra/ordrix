import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastItem {
  id: string;
  title: string;
  body?: string;
  tone?: ToastTone;
  /** Optional inline action rendered as a link. */
  href?: string;
  actionLabel?: string;
}

type Listener = (item: ToastItem) => void;
const listeners = new Set<Listener>();

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Fire a toast from anywhere in the app. */
export function toast(input: Omit<ToastItem, 'id'>): void {
  const item: ToastItem = { id: newId(), tone: 'info', ...input };
  listeners.forEach((l) => l(item));
}

const TONES: Record<ToastTone, { ring: string; icon: string; iconWrap: string }> = {
  info: { ring: 'ring-coffee-200', icon: '🔔', iconWrap: 'bg-coffee-100 text-coffee-700' },
  success: { ring: 'ring-green-200', icon: '✓', iconWrap: 'bg-green-100 text-green-700' },
  error: { ring: 'ring-red-200', icon: '⚠', iconWrap: 'bg-red-100 text-red-700' },
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (item) => {
      setItems((prev) => [...prev, item].slice(-4));
      const ttl = item.tone === 'success' ? 9000 : 6000;
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== item.id));
      }, ttl);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const dismiss = (id: string) => setItems((prev) => prev.filter((x) => x.id !== id));

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end">
      {items.map((t) => {
        const tone = TONES[t.tone ?? 'info'];
        return (
          <div
            key={t.id}
            className={`toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-white/70 bg-white/95 p-3.5 shadow-[0_24px_50px_-20px_rgba(58,20,37,.5)] ring-1 ${tone.ring} backdrop-blur`}
            role="status"
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-base font-bold ${tone.iconWrap}`}>
              {tone.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-coffee-900">{t.title}</p>
              {t.body ? <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{t.body}</p> : null}
              {t.href && t.actionLabel ? (
                <Link
                  to={t.href}
                  onClick={() => dismiss(t.id)}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-accent-600 transition hover:gap-2"
                >
                  {t.actionLabel} →
                </Link>
              ) : null}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-stone-400 transition hover:bg-coffee-100 hover:text-coffee-800"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
