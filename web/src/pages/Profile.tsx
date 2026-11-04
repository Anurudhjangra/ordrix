import { FormEvent, useEffect, useState } from 'react';
import { apiPatch } from '../lib/api';
import { useAuth } from '../store/auth';
import { Alert, Button, Field, Input, SectionTitle } from '../components/ui';

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', university: '' });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        phone: '',
        university: profile?.university ?? '',
      });
    }
  }, [user, profile]);

  if (!user) return null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await apiPatch('/api/auth/me', {
        name: form.name,
        phone: form.phone || null,
        university: form.university || null,
      });
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <SectionTitle title="Your profile" />
      <form onSubmit={save} className="card grid gap-4">
        {error ? <Alert>{error}</Alert> : null}
        {saved ? <Alert kind="success">Profile saved.</Alert> : null}
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-coffee-800 font-display text-xl font-bold text-cream-50">
            {form.name.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Account role</p>
            <p className="font-semibold capitalize text-coffee-900">{user.role}</p>
          </div>
        </div>

        <Field label="Full name">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email" hint="Email address can't be changed.">
          <Input value={user.email} disabled />
        </Field>
        <Field label="Phone (optional)">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98XXX XXXXX" />
        </Field>
        <Field label="University / college (optional)">
          <Input value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} />
        </Field>

        <Button variant="accent" loading={busy} type="submit">
          Save changes
        </Button>
      </form>
    </div>
  );
}