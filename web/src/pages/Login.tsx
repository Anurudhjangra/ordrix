import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { Alert, Button, Field, IconCup, Input } from '../components/ui';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin' : user.role === 'owner' || user.role === 'staff' ? '/staff' : from, {
        replace: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-gradient lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-coffee-900 via-coffee-800 to-coffee-900 p-10 lg:flex">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent-500/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-coffee-500/40 blur-3xl" />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-b from-accent-400 to-accent-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35)]">
              <IconCup size={22} />
            </span>
            <span className="font-display text-xl font-extrabold text-cream-50">
              Cafe <span className="text-gradient">My Frappe</span>
            </span>
          </Link>
        </div>
        <div className="relative">
          <h2 className="font-display text-3xl font-black leading-tight text-cream-50">
            Order in class.
            <br />
            Collect <span className="text-gradient">between classes.</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-coffee-200">
            Skip the queue with pre-orders, live order tracking and one-tap pickup codes.
          </p>
        </div>
        <div className="relative space-y-2.5">
          <AuthPoint label="Live menu with customisation" />
          <AuthPoint label="Real-time prep tracking" />
          <AuthPoint label="Verified pickup with a single code" />
        </div>
      </div>

      {/* Form panel */}
      <div className="relative p-6 sm:p-10">
        <div className="rounded-xl bg-cream-100/80 px-4 py-3 text-xs leading-relaxed text-stone-500">
          <strong className="text-coffee-700">Demo accounts</strong> — pick one to autofill:
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <DemoChip label="Student" onClick={() => { setEmail('student@mdu.test'); setPassword('Student@12345'); }} />
            <DemoChip label="Owner" onClick={() => { setEmail('owner@cafemyfrapey.test'); setPassword('Owner@12345'); }} />
            <DemoChip label="Admin" onClick={() => { setEmail('admin@cafemyfrapey.test'); setPassword('Admin@12345'); }} />
          </div>
        </div>

        <h1 className="mt-6 font-display text-2xl font-extrabold text-coffee-900">Welcome back</h1>
        <p className="mb-6 mt-1 text-sm text-stone-500">Sign in to order and track your pickup.</p>
        <form onSubmit={onSubmit} className="grid gap-4">
          {error ? <Alert>{error}</Alert> : null}
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mdu.test" autoComplete="email" />
          </Field>
          <Field label="Password">
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </Field>
          <Button variant="accent" size="lg" loading={busy} type="submit">
            Sign in
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-stone-500">
          New here?{' '}
          <Link to="/register" className="font-semibold text-accent-600 hover:text-accent-500">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

function AuthPoint({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2.5 text-sm text-coffee-100">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-500/20 text-accent-300" aria-hidden>
        ✓
      </span>
      {label}
    </p>
  );
}

function DemoChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-coffee-200 bg-white px-2.5 py-1 text-[11px] font-bold text-coffee-700 transition hover:border-accent-500 hover:text-accent-700"
    >
      {label}
    </button>
  );
}