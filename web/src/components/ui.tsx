import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { formatPaise, STATUS_LABELS, statusStyle } from '../lib/format';

/* ------------------------------------------------------------------ */
/* Icons (stroke, currentColor)                                        */
/* ------------------------------------------------------------------ */

function Svg({ children, className, size = 18 }: { children: ReactNode; className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconCup = ({ className, size }: { className?: string; size?: number }) => (
  <Svg className={className} size={size}>
    <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
    <path d="M9 1.5v3M6 3v1.5M12 1.5V3" />
  </Svg>
);

export const IconCart = ({ className, size }: { className?: string; size?: number }) => (
  <Svg className={className} size={size}>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </Svg>
);

export const IconBell = ({ className, size }: { className?: string; size?: number }) => (
  <Svg className={className} size={size}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Svg>
);

export const IconPlus = ({ className, size }: { className?: string; size?: number }) => (
  <Svg className={className} size={size}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconMinus = ({ className, size }: { className?: string; size?: number }) => (
  <Svg className={className} size={size}>
    <path d="M5 12h14" />
  </Svg>
);

export const IconCheck = ({ className, size }: { className?: string; size?: number }) => (
  <Svg className={className} size={size}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

export const IconArrowRight = ({ className, size }: { className?: string; size?: number }) => (
  <Svg className={className} size={size}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </Svg>
);

export const IconUser = ({ className, size }: { className?: string; size?: number }) => (
  <Svg className={className} size={size}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Svg>
);

export const IconLogout = ({ className, size }: { className?: string; size?: number }) => (
  <Svg className={className} size={size}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Svg>
);

export const IconClock = ({ className, size }: { className?: string; size?: number }) => (
  <Svg className={className} size={size}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </Svg>
);

export const IconFlame = ({ className, size }: { className?: string; size?: number }) => (
  <Svg className={className} size={size}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </Svg>
);

export const IconSparkle = ({ className, size }: { className?: string; size?: number }) => (
  <Svg className={className} size={size}>
    <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

export const IconBag = ({ className, size }: { className?: string; size?: number }) => (
  <Svg className={className} size={size}>
    <path d="M8 2 4 10v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10L16 2" />
    <path d="M2 10h20" />
    <path d="M8 6a4 4 0 0 0 8 0" />
  </Svg>
);

export const IconQR = ({ className, size }: { className?: string; size?: number }) => (
  <Svg className={className} size={size}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3zM17 17h4v4h-4zM21 14h1M14 21h2" />
  </Svg>
);

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Loader({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-coffee-600">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-accent-500/30 blur-md" />
        <Spinner className="relative h-8 w-8 text-accent-600" />
      </div>
      <span className="text-sm font-medium">{label ?? 'Loading…'}</span>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-accent-400/25 blur-2xl" />
        <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-coffee-100 to-cream-100 text-coffee-500 ring-gradient">
          <IconCup size={30} />
        </div>
      </div>
      <p className="mt-5 font-display text-xl font-bold text-coffee-900">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm text-stone-500">{body}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-green-200 bg-green-50 text-green-700',
    info: 'border-sky-200 bg-sky-50 text-sky-700',
  }[kind];
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${styles}`}>
      <span className="mt-0.5">{kind === 'error' ? '⚠' : kind === 'success' ? '✓' : 'ℹ'}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge shadow-sm ${statusStyle(status)}`}>{STATUS_LABELS[status] ?? status}</span>;
}

export function Money({ paise, className }: { paise: number | null | undefined; className?: string }) {
  return <span className={className}>{formatPaise(paise)}</span>;
}

export function Button({
  variant = 'primary',
  loading,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'accent' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'lg' | undefined;
  loading?: boolean;
}) {
  const sizeClass = props.size === 'sm' ? 'btn-sm' : props.size === 'lg' ? 'btn-lg' : '';
  const variantClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'accent'
        ? 'btn-accent'
        : variant === 'outline'
          ? 'btn-outline'
          : variant === 'danger'
            ? 'btn-danger'
            : 'btn-ghost';
  const { size: _size, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={props.disabled || loading}
      className={`btn ${variantClass} ${sizeClass} ${rest.className ?? ''}`.trim()}
    >
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {props.children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-stone-400">{hint}</span> : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ''}`.trim()} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`input ${props.className ?? ''}`.trim()} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input ${props.className ?? ''}`.trim()} />;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-coffee-900/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="fade-up w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        style={{ boxShadow: '0 30px 80px -20px rgba(51,37,26,.55)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-accent-400 via-accent-500 to-accent-600" />
        <div className="px-6 py-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-coffee-900">{title}</h3>
            <button
              className="grid h-9 w-9 place-items-center rounded-full bg-coffee-100 text-coffee-600 transition hover:bg-coffee-200 hover:text-coffee-900"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function SectionTitle({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return (
    <div className="mb-7">
      {eyebrow ? (
        <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.25em] text-accent-600">{eyebrow}</p>
      ) : null}
      <div className="mb-2 flex items-center gap-3">
        <span className="h-7 w-1.5 rounded-full bg-gradient-to-b from-accent-400 to-accent-600 shadow-[0_6px_14px_-6px_rgba(138,10,16,.6)]" />
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-coffee-900 sm:text-3xl">{title}</h1>
      </div>
      <div className="divider-gradient ml-4 max-w-xs" />
      {subtitle ? <p className="mt-3 pl-4 text-sm text-stone-500">{subtitle}</p> : null}
    </div>
  );
}