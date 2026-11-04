import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/api';
import { Alert, Button, Field, Input, Loader, Modal, SectionTitle } from '../../components/ui';
import type { SlotAvailability } from '../../lib/types';

export function StaffSlotsPage() {
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{ cafeId: string }>('/api/staff/dashboard');
      setCafeId(res.cafeId);
      const s = await apiGet<{ slots: SlotAvailability[] }>(`/api/staff/slots?cafeId=${res.cafeId}`);
      setSlots(s.slots);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (slot: SlotAvailability) => {
    if (!cafeId) return;
    try {
      await apiPatch(`/api/staff/slots/${slot.id}`, { cafeId, isActive: slot.is_active !== 1 });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (slot: SlotAvailability) => {
    if (!cafeId) return;
    try {
      await apiDelete(`/api/staff/slots/${slot.id}?cafeId=${cafeId}`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) return <Loader label="Loading pickup windows…" />;

  return (
    <div>
      <SectionTitle title="Pickup windows" subtitle="Slots students choose at checkout. Capacity limits orders per window." />
      {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}

      <div className="mb-6">
        <Button variant="accent" onClick={() => setShowCreate(true)}>
          New pickup window
        </Button>
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-stone-500">No pickup windows yet. Create one so students can pick a slot.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot) => (
            <div key={slot.id} className={`card ${slot.is_active !== 1 ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-coffee-900">{slot.label}</h3>
                <span className={`badge ${slot.is_active === 1 ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-500'}`}>
                  {slot.is_active === 1 ? 'Active' : 'Hidden'}
                </span>
              </div>
              <p className="mt-1 text-sm text-stone-500">
                {slot.start_time} – {slot.end_time}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                Capacity {slot.capacity} · booked {slot.booked} · remaining{' '}
                <span className={slot.remaining > 0 ? 'font-semibold text-coffee-800' : 'font-semibold text-red-600'}>{slot.remaining}</span>
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant={slot.is_active === 1 ? 'outline' : 'primary'} onClick={() => toggle(slot)}>
                  {slot.is_active === 1 ? 'Hide' : 'Show'}
                </Button>
                <Button size="sm" variant="danger" onClick={() => remove(slot)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate ? <CreateSlotModal cafeId={cafeId!} onClose={() => setShowCreate(false)} onSaved={load} /> : null}
    </div>
  );
}

function CreateSlotModal({ cafeId, onClose, onSaved }: { cafeId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ label: '', startTime: '09:00', endTime: '10:00', capacity: '20' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiPost('/api/staff/slots', {
        cafeId,
        label: form.label,
        startTime: form.startTime,
        endTime: form.endTime,
        capacity: Math.max(0, Math.round(Number(form.capacity))),
        isActive: true,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create slot');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="New pickup window">
      {error ? <div className="mb-3"><Alert>{error}</Alert></div> : null}
      <div className="grid gap-3">
        <Field label="Label">
          <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Between 1st & 2nd period" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time">
            <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </Field>
          <Field label="End time">
            <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </Field>
        </div>
        <Field label="Capacity (orders per window)">
          <Input type="number" min={0} max={500} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="accent" loading={busy} onClick={submit}>Create</Button>
      </div>
    </Modal>
  );
}