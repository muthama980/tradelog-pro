import Link from 'next/link';
import { Check } from 'lucide-react';

const TIERS = [
  {
    name: 'Core',
    price: 19,
    badge: null,
    description: 'For the disciplined trader.',
    features: [
      'Unlimited trade logs',
      'Strategy & emotion tagging',
      'Win rate, R-ratio, drawdown analytics',
      'CSV export anytime',
      'Email support',
      '4-day free trial — no card required',
    ],
    cta: 'Begin trial',
    href: '/signup?plan=core',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 25,
    badge: 'RECOMMENDED',
    description: 'For the trader who wants an edge.',
    features: [
      'Everything in Core',
      'AI Coach — weekly pattern analysis',
      'Advanced edge analytics',
      'Binance & Bybit CSV import',
      'Time-of-day & day-of-week stats',
      'Priority email support',
    ],
    cta: 'Begin trial',
    href: '/signup?plan=pro',
    highlight: true,
  },
  {
    name: 'Prop Trader',
    price: 30,
    badge: 'FUNDED TRADERS',
    description: 'For the trader chasing capital.',
    features: [
      'Everything in Pro',
      'FTMO-style challenge tracker',
      'Daily loss & drawdown alerts',
      'Phase 1 / Phase 2 reporting',
      'Account-level segmentation',
      'Direct line to founder',
    ],
    cta: 'Begin trial',
    href: '/signup?plan=prop',
    highlight: false,
  },
];

export default function Pricing({ standalone = false }: { standalone?: boolean }) {
  return (
    <section className={`relative ${standalone ? 'pt-28' : 'py-24'} pb-24 px-6 lg:px-10 bg-bg`} id="pricing">
      <div className="max-w-7xl mx-auto">
        <div className="mb-14 max-w-xl">
          <p className="mono-label mb-4">
            {standalone ? 'Pricing · Transparent' : 'Pricing'}
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-text tracking-tight">
            Priced for traders.{' '}
            <span className="text-text-muted font-medium">Not enterprises.</span>
          </h2>
          <p className="mt-4 text-text-muted text-sm leading-relaxed">
            Four days free. Cancel anytime. Annual billing saves you two months.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {TIERS.map((t, i) => (
            <div
              key={t.name}
              className={`relative flex flex-col rounded-xl border p-7 transition-all ${
                t.highlight
                  ? 'border-accent/50 bg-bg-surface shadow-[0_0_40px_rgba(0,217,255,0.06)]'
                  : 'border-border bg-bg-surface'
              }`}
            >
              {t.badge && (
                <div className={`absolute -top-3 left-6 font-mono text-[10px] tracking-widest uppercase px-3 py-1 rounded-full ${
                  t.highlight
                    ? 'bg-accent text-bg'
                    : 'bg-bg-elevated text-text-dim border border-border'
                }`}>
                  {t.badge}
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-bold text-xl text-text mb-1">{t.name}</h3>
                <p className="text-text-dim text-sm">{t.description}</p>
              </div>

              <div className="mb-6">
                <span className="font-mono text-5xl font-bold text-text tabular">${t.price}</span>
                <span className="text-text-dim text-sm ml-1.5">/month</span>
              </div>

              <div className="divider mb-6" />

              <ul className="space-y-3 flex-1 mb-7">
                {t.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <Check className={`shrink-0 mt-0.5 ${t.highlight ? 'text-accent' : 'text-signal-green'}`} size={16} strokeWidth={2.5} />
                    <span className="text-sm text-text-muted leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={t.href}
                className={t.highlight ? 'btn-primary w-full justify-center' : 'btn-secondary w-full justify-center'}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="mono-label tracking-wider">
            All plans · Powered by Lemon Squeezy · USD
          </p>
        </div>
      </div>
    </section>
  );
}
