import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { Alert, Button, Field, IconCup, Input } from '../components/ui';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [university, setUniversity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await register({ name, email, password, university: university || undefined });
      navigate(user.role === 'student' ? '/menu' : '/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
          <span className="inline-flex items-center gap-2.5">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-b from-accent-400 to-accent-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35)]">
              <IconCup size={22} />
            </span>
            <span className="font-display text-xl font-extrabold text-cream-50">
              <span className="text-gradient">ORDRIX</span>
            </span>
          </span>
        </div>
        <div className="relative">
          <h2 className="font-display text-3xl font-black leading-tight text-cream-50">
            Your order,
            <br />
            ready when <span className="text-gradient">you are.</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-coffee-200">
            Create a student account, order ahead from class and collect in seconds.
          </p>
        </div>
        <div className="relative space-y-2.5">
          <RegPoint label="No queue, no waiting" />
          <RegPoint label="Pay online — sandbox checkout" />
          <RegPoint label="Live status updates on every order" />
        </div>
      </div>

      {/* Form panel */}
      <div className="p-6 sm:p-10">
        <h1 className="font-display text-2xl font-extrabold text-coffee-900">Create your account</h1>
        <p className="mb-6 mt-1 text-sm text-stone-500">Join to start pre-ordering from ORDRIX.</p>
        <form onSubmit={onSubmit} className="grid gap-4">
          {error ? <Alert>{error}</Alert> : null}
          <Field label="Full name">
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Aanya Sharma" autoComplete="name" />
          </Field>
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mdu.test" autoComplete="email" />
          </Field>
          <Field label="Password" hint="At least 8 characters">
            <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="University / college (optional)">
            <Input value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="Maharshi Dayanand University" />
          </Field>
          <Button variant="accent" size="lg" loading={busy} type="submit">
            Create account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-stone-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-accent-600 hover:text-accent-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function RegPoint({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2.5 text-sm text-coffee-100">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-500/20 text-accent-300" aria-hidden>
        ✓
      </span>
      {label}
    </p>
  );
}