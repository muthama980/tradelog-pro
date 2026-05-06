'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState(false);       // session confirmed
  const [invalid, setInvalid] = useState(false);   // link expired / no session
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // The callback route exchanged the recovery code and set a session in cookies.
    // Verify the session is present before showing the form.
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setReady(true);
      } else {
        setInvalid(true);
      }
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => router.push('/dashboard'), 2000);
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-accent rounded-[4px] flex items-center justify-center">
            <span className="font-mono text-[11px] font-black text-bg tracking-[-0.05em]">TLP</span>
          </div>
          <span className="font-bold text-base text-text">TradeLog<span className="text-accent">Pro</span></span>
        </Link>

        <div className="card rounded-xl p-8">

          {/* Loading — checking session */}
          {!ready && !invalid && (
            <div className="text-center py-4">
              <p className="text-text-muted text-sm">Verifying reset link…</p>
            </div>
          )}

          {/* Expired / invalid link */}
          {invalid && (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-signal-red/10 border border-signal-red/30 flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="text-signal-red" size={22} />
              </div>
              <h2 className="font-bold text-2xl text-text mb-2">Link expired</h2>
              <p className="text-text-muted text-sm mb-7">
                This reset link has expired or already been used. Request a new one from the sign-in page.
              </p>
              <Link href="/login" className="btn-secondary w-full justify-center">
                Back to sign in
              </Link>
            </div>
          )}

          {/* Success */}
          {done && (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-signal-green/10 border border-signal-green/30 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="text-signal-green" size={22} />
              </div>
              <h2 className="font-bold text-2xl text-text mb-2">Password updated</h2>
              <p className="text-text-muted text-sm">Redirecting you to your dashboard…</p>
            </div>
          )}

          {/* Set new password form */}
          {ready && !done && (
            <>
              <h2 className="font-bold text-2xl text-text mb-1">Set new password</h2>
              <p className="text-text-muted text-sm mb-7">Choose a strong password for your account.</p>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="mono-label mb-2 block">New password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={15} />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoFocus
                      className="w-full bg-bg border border-border focus:border-accent/60 rounded-lg py-2.5 pl-10 pr-4 text-text text-sm outline-none transition"
                      placeholder="At least 8 characters"
                    />
                  </div>
                </div>

                <div>
                  <label className="mono-label mb-2 block">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={15} />
                    <input
                      type="password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                      className="w-full bg-bg border border-border focus:border-accent/60 rounded-lg py-2.5 pl-10 pr-4 text-text text-sm outline-none transition"
                      placeholder="Repeat your new password"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-signal-red border border-signal-red/30 bg-signal-red/5 p-3 rounded-lg">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                  {loading ? 'Updating…' : <><span>Update password</span><ArrowRight size={15} className="ml-2" /></>}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
