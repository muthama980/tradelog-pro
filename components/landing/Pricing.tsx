'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Clock, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import PaymentMethodModal from '@/components/PaymentMethodModal';

type FeatureItem = string | { text: string; soon: boolean };

interface Tier {
  name: string;
  price: string;
  planKey: string;
  badge: string | null;
  description: string;
  features: FeatureItem[];
  cta: string;
  signupHref: string;
  highlight: boolean;
  comingSoon: boolean;
}

const TIERS: Tier[] = [
  {
    name: 'Core',
    price: '$19',
    planKey: 'core',
    badge: null,
    description: 'For the disciplined trader building their edge.',
    features: [
      'Unlimited trade logging',
      'Strategy & emotion tagging',
      'Mistake tracking',
      'Basic analytics (equity curve, win rate, total P&L)',
      'Daily risk status alerts',
      'CSV export',
      '1 exchange connection',
      'Email support',
    ],
    cta: 'Begin trial',
    signupHref: '/signup?plan=core',
    highlight: false,
    comingSoon: false,
  },
  {
    name: 'Pro',
    price: '$25',
    planKey: 'pro',
    badge: 'RECOMMENDED',
    description: 'For the trader who wants a measurable edge.',
    features: [
      'Everything in Core',
      'AI Coach weekly reports',
      'Full analytics suite (by strategy, emotion, mistake, time of day)',
      'Unlimited exchange connections',
      'Advanced journal filters',
      'Priority support',
    ],
    cta: 'Begin trial',
    signupHref: '/signup?plan=pro',
    highlight: true,
    comingSoon: false,
  },
  {
    name: 'Elite',
    price: '$40',
    planKey: 'prop',
    badge: 'COMING SOON',
    description: 'For the serious investor tracking every asset class.',
    features: [
      { text: 'Everything in Pro', soon: false },
      { text: 'Portfolio tracker (crypto, stocks, forex)', soon: true },
      { text: 'Real-time portfolio valuation', soon: true },
      { text: 'Asset allocation dashboard', soon: true },
      { text: 'Watchlist with price alerts', soon: true },
      { text: 'Dividend & yield tracking', soon: true },
      { text: 'Staking rewards tracking', soon: true },
      { text: 'Multi-account support', soon: true },
      { text: 'Monthly portfolio report', soon: true },
    ],
    cta: 'Coming Soon',
    signupHref: '/signup?plan=prop',
    highlight: false,
    comingSoon: true,
  },
];

type ModalPlan = { planKey: string; planName: string; planPrice: string } | null;

export default function Pricing({ standalone = false }: { standalone?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalPlan, setModalPlan] = useState<ModalPlan>(null);
  const [showEliteWaitlist, setShowEliteWaitlist] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  function closeWaitlist() {
    setShowEliteWaitlist(false);
    setWaitlistSubmitted(false);
    setWaitlistEmail('');
  }

  async function handleCTAClick(tier: Tier) {
    if (tier.comingSoon) {
      setShowEliteWaitlist(true);
      return;
    }
    setLoading(tier.planKey);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(tier.signupHref);
        return;
      }
      setModalPlan({ planKey: tier.planKey, planName: tier.name, planPrice: tier.price });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
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

          {error && (
            <div className="mb-6 text-sm text-signal-red border border-signal-red/30 bg-signal-red/5 p-3 rounded-lg max-w-md">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4 items-start">
            {TIERS.map((t) => {
              const featureText = (f: FeatureItem) => typeof f === 'string' ? f : f.text;
              const featureSoon = (f: FeatureItem) => typeof f === 'string' ? false : f.soon;

              const inner = (
                <>
                  {t.badge && (
                    <div className={`absolute -top-3 left-6 font-mono text-[10px] tracking-widest uppercase px-3 py-1 rounded-full ${
                      t.highlight
                        ? 'bg-accent text-bg'
                        : t.comingSoon
                        ? 'bg-bg-elevated text-accent border border-accent/40'
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
                    <span className="font-mono text-4xl font-bold text-text tabular">{t.price}</span>
                    <span className="text-text-dim text-sm ml-1.5">/month</span>
                  </div>

                  <div className="divider mb-6" />

                  <ul className="space-y-3 flex-1 mb-7">
                    {t.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <Check
                          className={`shrink-0 mt-0.5 ${
                            t.highlight ? 'text-accent' : featureSoon(f) ? 'text-text-dim/50' : 'text-signal-green'
                          }`}
                          size={16}
                          strokeWidth={2.5}
                        />
                        <span className="text-sm text-text-muted leading-relaxed flex-1">{featureText(f)}</span>
                        {featureSoon(f) && (
                          <span className="font-mono text-[9px] uppercase tracking-widest text-accent border border-accent/25 rounded px-1.5 py-0.5 shrink-0 self-start mt-0.5">
                            soon
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleCTAClick(t)}
                    disabled={loading === t.planKey}
                    className={`${
                      t.comingSoon
                        ? 'btn-secondary'
                        : t.highlight
                        ? 'btn-primary'
                        : 'btn-secondary'
                    } w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {loading === t.planKey ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : t.comingSoon ? (
                      <>
                        <Clock size={14} className="mr-2 text-accent" />
                        {t.cta}
                      </>
                    ) : (
                      t.cta
                    )}
                  </button>
                </>
              );

              if (t.comingSoon) {
                return (
                  <div
                    key={t.name}
                    className="p-px rounded-xl"
                    style={{ background: 'linear-gradient(135deg, rgba(0,217,255,0.4) 0%, rgba(0,217,255,0.1) 40%, rgba(139,92,246,0.25) 100%)' }}
                  >
                    <div className="relative flex flex-col rounded-[11px] bg-bg-surface p-7 h-full">
                      {inner}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={t.name}
                  className={`relative flex flex-col rounded-xl border p-7 transition-all ${
                    t.highlight
                      ? 'border-accent/50 bg-bg-surface shadow-[0_0_40px_rgba(0,217,255,0.06)]'
                      : 'border-border bg-bg-surface'
                  }`}
                >
                  {inner}
                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <p className="mono-label tracking-wider">
              All plans · 4-day free trial · Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Elite Waitlist Modal */}
      {showEliteWaitlist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/70" onClick={closeWaitlist} />
          <div className="relative card rounded-xl p-8 max-w-md w-full border-accent/30 shadow-[0_0_60px_rgba(0,217,255,0.1)]">
            <button
              onClick={closeWaitlist}
              className="absolute top-4 right-4 text-text-dim hover:text-text transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg border border-accent/30 bg-accent/10 flex items-center justify-center shrink-0">
                <Clock className="text-accent" size={16} />
              </div>
              <div>
                <h3 className="font-bold text-text text-lg leading-tight">Elite Plan</h3>
                <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Coming Soon</p>
              </div>
            </div>

            {!waitlistSubmitted ? (
              <>
                <p className="text-text-muted text-sm leading-relaxed mb-6">
                  Elite plan is coming soon. Leave your email and we'll notify you the moment it launches — including early-bird pricing.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setWaitlistSubmitted(true)}
                    placeholder="your@email.com"
                    className="flex-1 bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
                  />
                  <button
                    onClick={() => setWaitlistSubmitted(true)}
                    className="btn-primary shrink-0 text-sm"
                  >
                    Notify me
                  </button>
                </div>
                <p className="mt-3 mono-label tracking-wider text-center">
                  No spam · Unsubscribe anytime
                </p>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-signal-green/10 border border-signal-green/30 flex items-center justify-center mx-auto mb-4">
                  <Check className="text-signal-green" size={20} strokeWidth={2.5} />
                </div>
                <p className="font-bold text-text mb-1">You're on the list.</p>
                <p className="text-text-muted text-sm">We'll email you when Elite launches.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {modalPlan && (
        <PaymentMethodModal
          isOpen={!!modalPlan}
          onClose={() => setModalPlan(null)}
          planKey={modalPlan.planKey}
          planName={modalPlan.planName}
          planPrice={modalPlan.planPrice}
        />
      )}
    </>
  );
}
