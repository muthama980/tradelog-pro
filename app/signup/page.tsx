'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowRight, Mail, Lock, User, Eye, EyeOff, Wand2 } from 'lucide-react';

function checkRules(pw: string) {
  return {
    minLength: pw.length >= 8,
    hasUpper: /[A-Z]/.test(pw),
    hasLower: /[a-z]/.test(pw),
    hasNumber: /[0-9]/.test(pw),
    hasSpecial: /[!@#$%^&*]/.test(pw),
  };
}

function strengthLevel(rules: ReturnType<typeof checkRules>): 'weak' | 'medium' | 'strong' {
  const score = Object.values(rules).filter(Boolean).length;
  if (score <= 2) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
}

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const nums = '23456789';
  const special = '!@#$%^&*';
  const all = upper + lower + nums + special;
  const pw = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    lower[Math.floor(Math.random() * lower.length)],
    nums[Math.floor(Math.random() * nums.length)],
    nums[Math.floor(Math.random() * nums.length)],
    special[Math.floor(Math.random() * special.length)],
    ...Array.from({ length: 8 }, () => all[Math.floor(Math.random() * all.length)]),
  ];
  for (let i = pw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pw[i], pw[j]] = [pw[j], pw[i]];
  }
  return pw.join('');
}

const RULE_LABELS: [keyof ReturnType<typeof checkRules>, string][] = [
  ['minLength', '8+ characters'],
  ['hasUpper',  'Uppercase letter'],
  ['hasLower',  'Lowercase letter'],
  ['hasNumber', 'Number'],
  ['hasSpecial', 'Special (!@#$%^&*)'],
];

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get('plan') || 'pro';
  const supabase = createClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  const rules = useMemo(() => checkRules(password), [password]);
  const strength = useMemo(() => strengthLevel(rules), [rules]);

  const strengthConfig = {
    weak:   { segments: 1, color: 'bg-signal-red',  label: 'Weak',   text: 'text-signal-red'  },
    medium: { segments: 2, color: 'bg-amber-400',   label: 'Medium', text: 'text-amber-400'   },
    strong: { segments: 3, color: 'bg-signal-green', label: 'Strong', text: 'text-signal-green' },
  };
  const sc = strengthConfig[strength];

  const confirmMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  function suggestPassword() {
    const pw = generatePassword();
    setPassword(pw);
    setConfirmPassword(pw);
    setShowPassword(true);
    setShowConfirm(true);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be at least 8 characters with at least one letter and one number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setLoadingStep('Creating your account…');

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, plan_intent: plan, email_opt_in: emailOptIn },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setLoadingStep('Setting up your dashboard…');

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const userId = signInData.user.id;
    const trialEndsAt = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('profiles').upsert({
      id: userId,
      full_name: name,
      email: email,
      plan: 'trial',
      plan_intent: plan || 'pro',
      trial_ends_at: trialEndsAt,
      email_opt_in: emailOptIn,
    }, { onConflict: 'id' });

    localStorage.setItem('tlp_remember', 'true');

    router.push('/dashboard');
    router.refresh();
  }

  async function signupWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://tradelogpro.xyz/auth/callback',
        queryParams: {
          prompt: 'select_account',
          plan_intent: plan,
        },
      },
    });
  }

  return (
    <>
      <h2 className="font-bold text-2xl text-text mb-1">Begin your trial</h2>
      <p className="text-text-muted text-sm mb-2">Four days free · No credit card required</p>
      {plan && (
        <div className="inline-block font-mono text-[10px] tracking-widest text-accent uppercase border border-accent/30 px-2.5 py-1 rounded-full mb-6">
          Plan: {plan}
        </div>
      )}

      <button
        onClick={signupWithGoogle}
        disabled={loading}
        className="w-full py-2.5 px-4 border border-border-strong hover:border-accent/40 rounded-lg flex items-center justify-center gap-3 text-sm text-text-muted hover:text-text transition mb-5 bg-bg-elevated disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.657 14.013 17.64 11.705 17.64 9.2z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.98.66-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A9 9 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        Continue with Google
      </button>
      <p className="text-xs text-text-muted text-center -mt-3 mb-5">
        If Google sign-in fails, open this page in Chrome or your default browser.
      </p>

      <div className="flex items-center gap-3 my-5">
        <div className="h-px flex-1 bg-border" />
        <span className="font-mono text-[10px] tracking-widest text-text-dim uppercase">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Full name */}
        <div>
          <label className="mono-label mb-2 block">Full name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={15} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              className="w-full bg-bg border border-border focus:border-accent/60 rounded-lg py-2.5 pl-10 pr-4 text-text text-sm placeholder:text-text-dim outline-none transition disabled:opacity-60"
              placeholder="Jane Trader"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="mono-label mb-2 block">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={15} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full bg-bg border border-border focus:border-accent/60 rounded-lg py-2.5 pl-10 pr-4 text-text text-sm placeholder:text-text-dim outline-none transition disabled:opacity-60"
              placeholder="you@trader.com"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="mono-label">Password</label>
            <button
              type="button"
              onClick={suggestPassword}
              disabled={loading}
              className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-accent uppercase hover:text-accent/70 transition disabled:opacity-50"
            >
              <Wand2 size={11} />
              Suggest strong password
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={15} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full bg-bg border border-border focus:border-accent/60 rounded-lg py-2.5 pl-10 pr-10 text-text text-sm placeholder:text-text-dim outline-none transition disabled:opacity-60"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text transition"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* Strength indicator */}
          {password && (
            <div className="mt-2.5 space-y-2">
              {/* Segmented bar */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${
                        i < sc.segments ? sc.color : 'bg-border'
                      }`}
                    />
                  ))}
                </div>
                <span className={`font-mono text-[10px] tracking-widest uppercase shrink-0 ${sc.text}`}>
                  {sc.label}
                </span>
              </div>

              {/* Rules checklist */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {RULE_LABELS.map(([key, label]) => {
                  const ok = rules[key];
                  return (
                    <div key={key} className="flex items-center gap-1.5">
                      <span className={`font-mono text-[11px] leading-none ${ok ? 'text-signal-green' : 'text-text-dim'}`}>
                        {ok ? '✓' : '×'}
                      </span>
                      <span className={`font-mono text-[10px] ${ok ? 'text-text-muted' : 'text-text-dim'}`}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="mono-label mb-2 block">Confirm password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={15} />
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              className={`w-full bg-bg border rounded-lg py-2.5 pl-10 pr-10 text-text text-sm placeholder:text-text-dim outline-none transition disabled:opacity-60 ${
                confirmMismatch ? 'border-signal-red/60 focus:border-signal-red' : 'border-border focus:border-accent/60'
              }`}
              placeholder="Repeat your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text transition"
            >
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {confirmMismatch && (
            <p className="mt-1.5 font-mono text-[10px] text-signal-red">Passwords do not match</p>
          )}
        </div>

        {/* Email opt-in */}
        <div className="flex items-start gap-3 py-1">
          <input
            type="checkbox"
            id="email_opt_in"
            checked={emailOptIn}
            onChange={(e) => setEmailOptIn(e.target.checked)}
            disabled={loading}
            className="mt-0.5 accent-[#00D9FF] cursor-pointer"
          />
          <label htmlFor="email_opt_in" className="text-sm text-text-muted cursor-pointer leading-relaxed select-none">
            Send me trading tips and product updates
          </label>
        </div>

        {error && (
          <div className="text-sm text-signal-red border border-signal-red/30 bg-signal-red/5 p-3 rounded-lg">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
          {loading
            ? loadingStep
            : <><span>Begin 4-day trial</span><ArrowRight size={15} className="ml-2" /></>}
        </button>
      </form>

      <p className="mt-5 text-sm text-text-muted text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:underline underline-offset-4 transition">
          Sign in
        </Link>
      </p>
    </>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-accent rounded-[4px] flex items-center justify-center">
            <span className="font-mono text-[11px] font-black text-bg tracking-[-0.05em]">TLP</span>
          </div>
          <span className="font-bold text-base text-text">TradeLog<span className="text-accent">Pro</span></span>
        </Link>

        <div className="card rounded-xl p-8">
          <Suspense fallback={<div className="text-text-dim">Loading…</div>}>
            <SignupForm />
          </Suspense>
        </div>

        <p className="mt-8 font-mono text-[11px] tracking-widest text-text-dim text-center uppercase">
          For traders worldwide
        </p>
      </div>
    </div>
  );
}
