export function formatPaise(paise: number | null | undefined): string {
  const value = Number(paise ?? 0);
  const rupees = value / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}

export function formatCount(n: number | null | undefined): string {
  return new Intl.NumberFormat('en-IN').format(Number(n ?? 0));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export const STATUS_LABELS: Record<string, string> = {
  awaiting_acceptance: 'Awaiting acceptance',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready for pickup',
  collected: 'Collected',
  rejected: 'Rejected',
  cancellation_requested: 'Cancellation requested',
  cancelled: 'Cancelled',
  refund_pending: 'Refund pending',
  refunded: 'Refunded',
};

export const PAYMENT_LABELS: Record<string, string> = {
  created: 'Payment created',
  pending: 'Payment pending',
  verified: 'Paid',
  failed: 'Payment failed',
  refund_initiated: 'Refund initiated',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded',
};

const STATUS_STYLE: Record<string, string> = {
  awaiting_acceptance: 'bg-amber-100 text-amber-800',
  accepted: 'bg-sky-100 text-sky-800',
  preparing: 'bg-violet-100 text-violet-800',
  ready: 'bg-green-100 text-green-800',
  collected: 'bg-stone-200 text-stone-700',
  rejected: 'bg-red-100 text-red-700',
  cancellation_requested: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
  refund_pending: 'bg-yellow-100 text-yellow-800',
  refunded: 'bg-stone-200 text-stone-700',
};

export function statusStyle(status: string): string {
  return STATUS_STYLE[status] ?? 'bg-stone-100 text-stone-600';
}

export const ORDER_STATUSES = [
  'awaiting_acceptance',
  'accepted',
  'preparing',
  'ready',
  'collected',
  'rejected',
  'cancellation_requested',
  'cancelled',
  'refund_pending',
  'refunded',
] as const;

export function orderStepIndex(status: string): number {
  const happyPath = ['awaiting_acceptance', 'accepted', 'preparing', 'ready', 'collected'];
  const idx = happyPath.indexOf(status);
  if (status === 'rejected' || status === 'cancelled') return -1;
  if (status === 'refund_pending' || status === 'refunded') return happyPath.indexOf('ready') + 1;
  return idx;
}