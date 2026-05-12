import Link from 'next/link';
import Pricing from '@/components/landing/Pricing';

export default function TrialExpiredPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="border-b border-border bg-bg-surface/80 backdrop-blur-sm px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-[4px] flex items-center justify-center">
            <span className="font-mono text-[11px] font-black text-bg tracking-[-0.05em]">TLP</span>
          </div>
          <span className="font-bold text-base text-text">TradeLog<span className="text-accent">Pro</span></span>
        </Link>
      </div>

      {/* Hero message */}
      <div className="max-w-2xl mx-auto px-6 pt-20 pb-4 text-center">
        <div className="inline-flex items-center gap-2 border border-border bg-bg-elevated px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-red shrink-0" />
          <span className="font-mono text-[10px] tracking-[0.14em] text-text-dim uppercase">
            Trial ended
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text mb-5 leading-[1.1]">
          Your 4-day free trial has ended.
        </h1>

        <p className="text-text-muted text-lg leading-relaxed mb-4">
          Your trades and data are safe — nothing has been deleted.
          Choose a plan to continue where you left off.
        </p>

        <p className="font-mono text-[11px] tracking-widest text-text-dim uppercase">
          No card was required during your trial · Secure payment via Lemon Squeezy
        </p>
      </div>

      {/* Pricing cards — reuses the full Pricing component */}
      <Pricing standalone />

      {/* Footer note */}
      <div className="pb-16 text-center px-6">
        <p className="text-sm text-text-muted">
          Need more time or have questions?{' '}
          <Link href="/contact" className="text-accent hover:underline underline-offset-4 transition">
            Contact us
          </Link>
          {' '}and we&apos;ll sort it out.
        </p>
        <p className="mt-3 font-mono text-[10px] tracking-widest text-text-dim uppercase">
          Already paid?{' '}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
