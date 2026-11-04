import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut } from '../../lib/api';
import { formatPaise } from '../../lib/format';
import { Alert, Button, Field, Input, Loader, SectionTitle } from '../../components/ui';

interface Settings {
  taxPercent: number;
  serviceFeePaise: number;
  orderAcceptTimeoutMinutes: number;
  defaultPickupWindowMinutes: number;
}

export function StaffSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<boolean | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<{ cafeId: string; settings: Settings }>('/api/staff/dashboard');
        setCafeId(res.cafeId);
        setSettings(res.settings);
        const cafes = await apiGet<{ cafes: { id: string; is_accepting_orders: number; pause_reason: string | null }[] }>('/api/cafes');
        const mine = cafes.cafes.find((c) => c.id === res.cafeId);
        if (mine) {
          setAccepting(mine.is_accepting_orders === 1);
          setPauseReason(mine.pause_reason ?? '');
        }
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  const saveSettings = async (field: keyof Settings, value: number) => {
    if (!value || value < 0) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const body: Record<string, number> = { [field]: value };
      const res = await apiPut<{ settings: Settings }>('/api/staff/settings', body);
      setSettings(res.settings);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save settings');
    } finally {
      setBusy(false);
    }
  };

  const toggleAccepting = async (next: boolean) => {
    if (!cafeId) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost('/api/staff/cafe/accepting', { cafeId, isAccepting: next, reason: next ? undefined : pauseReason.trim() || 'Online orders paused' });
      setAccepting(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update availability');
    } finally {
      setBusy(false);
    }
  };

  if (!settings || cafeId === null) return <Loader label="Loading settings…" />;

  return (
    <div>
      <SectionTitle title="Cafe settings" subtitle="Charges, auto-accept timeouts, and order availability." />
      {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}
      {saved ? <div className="mb-4"><Alert kind="success">Settings saved.</Alert></div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h3 className="mb-3 font-display text-lg font-bold text-coffee-800">Accepting orders</h3>
          <p className="mb-3 text-sm text-stone-500">
            When paused, students can browse the menu but can't place orders. Useful during rush or before a closure.
          </p>
          {accepting === null ? null : accepting ? (
            <div className="flex items-center gap-3">
              <span className="badge bg-green-100 text-green-800">Accepting orders</span>
              <Button variant="danger" loading={busy} onClick={() => toggleAccepting(false)}>
                Pause online orders
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              <Field label="Pause reason (shown to students)">
                <Input value={pauseReason} onChange={(e) => setPauseReason(e.target.value)} placeholder="e.g. Prepping for the lunch rush" />
              </Field>
              <Button variant="accent" loading={busy} onClick={() => toggleAccepting(true)}>
                Resume accepting orders
              </Button>
            </div>
          )}
        </section>

        <section className="card">
          <h3 className="mb-3 font-display text-lg font-bold text-coffee-800">Charges</h3>
          <NumberField
            label="Tax rate (%)"
            hint="Applied on top of the subtotal for every order."
            value={settings.taxPercent}
            onSave={(v) => saveSettings('taxPercent', v)}
          />
          <NumberField
            label="Service fee (₹)"
            hint={`Currently ${formatPaise(settings.serviceFeePaise)} per order.`}
            value={settings.serviceFeePaise}
            onSave={(v) => saveSettings('serviceFeePaise', v)}
            rupees
          />
        </section>

        <section className="card">
          <h3 className="mb-3 font-display text-lg font-bold text-coffee-800">Auto-accept timeout</h3>
          <p className="mb-3 text-sm text-stone-500">
            Orders that stay unaccepted past this many minutes are flagged for follow-up in the queue.
          </p>
          <NumberField
            label="Timeout (minutes)"
            value={settings.orderAcceptTimeoutMinutes}
            onSave={(v) => saveSettings('orderAcceptTimeoutMinutes', v)}
          />
        </section>
      </div>
    </div>
  );
}

function NumberField({ label, hint, value, onSave, rupees }: { label: string; hint?: string; value: number; onSave: (v: number) => void; rupees?: boolean }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const parsed = rupees ? Math.round(Number(draft) * 100 || 0) : Number(draft);
  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-2">
        <Input type="number" min={0} step={rupees ? '1' : '0.5'} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button
          variant="primary"
          onClick={() => onSave(parsed)}
          disabled={rupees ? Number(draft) === value / 100 : Number(draft) === value}
        >
          Save
        </Button>
      </div>
    </Field>
  );
}