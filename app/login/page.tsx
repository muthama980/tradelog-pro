'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowRight, Mail, Lock } from 'lucide-react';

const CHECKBOX_KEY = 'tlp_checkbox_pref';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(CHECKBOX_KEY);
    if (saved !== null) setRememberMe(saved === 'true');
  }, []);

  function handleRememberChange(checked: boolean) {
    setRememberMe(checked);
    localStorage.setItem(CHECKBOX_KEY, String(checked));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setError('Please confirm your email first. Check your inbox for the confirmation link.');
      } else {
        setError(error.message);
      }
      return;
    }
    if (rememberMe) {
      localStorage.setItem('tlp_remember', 'true');
      sessionStorage.removeItem('tlp_session_active');
    } else {
      localStorage.removeItem('tlp_remember');
      sessionStorage.setItem('tlp_session_active', '1');
    }
    router.push('/dashboard');
    router.refresh();
  }

  // Google OAuth — requires: Supabase Dashboard → Authentication → Providers → Google (enable + add Client ID/Secret)
  // and Google Cloud Console → OAuth 2.0 credentials with this origin + /auth/callback as authorised redirect URI.
  async function signInWithGoogle() {
    localStorage.setItem('tlp_remember', 'true');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
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
          <h2 className="font-bold text-2xl text-text mb-1">Sign in</h2>
          <p className="text-text-muted text-sm mb-7">
            New here?{' '}
            <Link href="/signup" className="text-accent hover:text-accent-glow underline-offset-4 hover:underline transition">
              Start your free trial →
            </Link>
          </p>

          <button
            onClick={signInWithGoogle}
            className="w-full py-2.5 px-4 border border-border-strong hover:border-accent/40 rounded-lg flex items-center justify-center gap-3 text-sm text-text-muted hover:text-text transition mb-5 bg-bg-elevated"
          >
            <svg width="16" height="16" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.657 14.013 17.64 11.705 17.64 9.2z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A9 9 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] tracking-widest text-text-dim uppercase">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mono-label mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={15} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-bg border border-border focus:border-accent/60 rounded-lg py-2.5 pl-10 pr-4 text-text text-sm placeholder:text-text-dim outline-none transition"
                  placeholder="you@trader.com"
                />
              </div>
            </div>

            <div>
              <label className="mono-label mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={15} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-bg border border-border focus:border-accent/60 rounded-lg py-2.5 pl-10 pr-4 text-text text-sm outline-none transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => handleRememberChange(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer accent-[#00D9FF]"
              />
              <label htmlFor="remember-me" className="text-sm text-text-muted cursor-pointer select-none">
                Keep me signed in
              </label>
            </div>

            {error && (
              <div className="text-sm text-signal-red border border-signal-red/30 bg-signal-red/5 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Signing in…' : <><span>Sign in</span><ArrowRight size={15} className="ml-2" /></>}
            </button>
          </form>

          <p className="mt-6 font-mono text-[10px] tracking-widest text-text-dim text-center uppercase">
            By signing in you agree to our terms
          </p>
        </div>

        <p className="mt-8 font-mono text-[11px] tracking-widest text-text-dim text-center uppercase">
          For traders worldwide
        </p>
      </div>
    </div>
  );
}
