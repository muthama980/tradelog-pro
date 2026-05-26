'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Video, Users, Link2, Image, Clock, Headphones,
  ChevronRight, Loader2, Check, AlertTriangle,
} from 'lucide-react';

const STEPS = [
  {
    n: '1',
    title: 'Apply',
    desc: 'Fill out a quick application. Tell us about your audience and content.',
  },
  {
    n: '2',
    title: 'Get Approved',
    desc: 'We review your application within 48 hours. Once approved, you get your custom referral link and marketing kit.',
  },
  {
    n: '3',
    title: 'Earn',
    desc: 'Share your link. Earn 36% recurring commission per referral for 12 months. Paid monthly.',
  },
];

const WHAT_YOU_GET = [
  {
    icon: Link2,
    title: 'Custom Referral Link',
    desc: 'Unique tracking link with real-time dashboard showing clicks, signups, and earnings.',
  },
  {
    icon: Image,
    title: 'Marketing Assets',
    desc: 'Banners, screenshots, demo videos, and copy you can use in your content.',
  },
  {
    icon: Clock,
    title: 'Extended Trials',
    desc: 'Offer your audience an exclusive 8-day free trial instead of the standard 4 days.',
  },
  {
    icon: Headphones,
    title: 'Priority Support',
    desc: 'Direct line to the founder. Feature requests prioritized. Early access to new features.',
  },
];

const NICHES = [
  'Forex trading education',
  'Crypto trading and analysis',
  'Prop firm challenges and reviews',
  'Trading psychology and mindset',
  'Day trading and swing trading',
  'Financial education and literacy',
];

const EMPTY_FORM = {
  name: '', email: '', platform: '', channel_url: '',
  audience_size: '', niche: '', country: '', message: '',
};

export default function AffiliatesPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  function update(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/affiliates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="bg-bg">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="grid-bg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/30 to-bg pointer-events-none" />
          <div className="relative max-w-5xl mx-auto px-6 lg:px-10 pt-24 pb-20 text-center">
            <p className="mono-label text-accent mb-4">Partner Program</p>
            <h1 className="text-4xl md:text-5xl font-bold text-text tracking-tight mb-5 leading-tight">
              Earn With TradeLog Pro
            </h1>
            <p className="text-text-muted text-lg max-w-2xl mx-auto mb-12">
              Join our affiliate program and earn recurring commissions for every trader you refer.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {/* Content Creators card */}
              <div className="card rounded-xl p-6 text-left">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Video size={18} className="text-accent" strokeWidth={1.7} />
                  </div>
                  <h3 className="font-bold text-text">Content Creators</h3>
                </div>
                <p className="font-mono text-xl font-bold text-accent mb-3">Up to 36% recurring</p>
                <ul className="space-y-2">
                  {['YouTube, TikTok, Instagram creators with trading audiences', 'Custom referral links, marketing assets, priority support'].map(t => (
                    <li key={t} className="flex items-start gap-2 text-sm text-text-muted">
                      <Check size={13} className="text-accent mt-0.5 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Community Leaders card */}
              <div className="card rounded-xl p-6 text-left">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Users size={18} className="text-accent" strokeWidth={1.7} />
                  </div>
                  <h3 className="font-bold text-text">Community Leaders</h3>
                </div>
                <p className="font-mono text-xl font-bold text-accent mb-3">Up to 36% recurring</p>
                <ul className="space-y-2">
                  {['Discord mods, Telegram admins, Facebook group owners', 'Bulk trial codes, co-branded content, dedicated partner manager'].map(t => (
                    <li key={t} className="flex items-start gap-2 text-sm text-text-muted">
                      <Check size={13} className="text-accent mt-0.5 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works ──────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-6 lg:px-10 py-20">
          <p className="mono-label text-center mb-3">How it works</p>
          <h2 className="text-3xl font-bold text-text text-center mb-12">Three steps to earning</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step) => (
              <div key={step.n} className="card rounded-xl p-6">
                <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mb-4">
                  <span className="font-mono font-bold text-accent text-sm">{step.n}</span>
                </div>
                <h3 className="font-bold text-text mb-2">{step.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Commission Details ─────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-6 lg:px-10 pb-20">
          <div className="bg-bg-surface border border-border rounded-xl p-8">
            <p className="mono-label mb-3">Commission structure</p>
            <h2 className="text-2xl font-bold text-text mb-2">How much will you earn?</h2>
            <p className="text-text-muted text-sm mb-6">Earn 36% of every subscription for 12 months — recurring monthly income for a full year per referral.</p>

            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {[
                { plan: 'Core plan', price: '$19/mo', earn: '$6.84/mo', total: '$82.08', color: 'text-text' },
                { plan: 'Pro plan', price: '$25/mo', earn: '$9.00/mo', total: '$108.00', color: 'text-accent' },
                { plan: 'Elite plan', price: '$40/mo', earn: '$14.40/mo', total: '$172.80', color: 'text-text' },
              ].map(({ plan, price, earn, total, color }) => (
                <div key={plan} className="bg-bg border border-border rounded-lg p-4">
                  <p className="font-mono text-xs text-text-dim uppercase tracking-widest mb-1">{plan}</p>
                  <p className="text-text-muted text-sm mb-2">{price}</p>
                  <p className={`font-mono font-bold text-lg ${color}`}>{earn}</p>
                  <p className="text-text-dim text-xs mb-1">per referral / month</p>
                  <p className="font-mono text-xs text-accent">= {total} per referral (12 mo)</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 mb-6 border-t border-border pt-6">
              {[
                '10 referrals on Pro = $90/mo for 12 months',
                '50 referrals on Pro = $450/mo for 12 months',
                '100 referrals on Pro = $900/mo for 12 months',
              ].map(line => (
                <div key={line} className="flex items-center gap-2 text-sm text-text-muted">
                  <ChevronRight size={13} className="text-accent shrink-0" />
                  {line}
                </div>
              ))}
            </div>

            <p className="text-accent font-medium text-sm">
              36% recurring for 12 months per referral — not a one-time payment.
            </p>
          </div>
        </section>

        {/* ── What You Get ──────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-6 lg:px-10 pb-20">
          <p className="mono-label text-center mb-3">Benefits</p>
          <h2 className="text-3xl font-bold text-text text-center mb-12">What you get</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WHAT_YOU_GET.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card rounded-xl p-5">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Icon size={17} className="text-accent" strokeWidth={1.7} />
                </div>
                <h3 className="font-bold text-text text-sm mb-2">{title}</h3>
                <p className="text-text-muted text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Who We're Looking For ─────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-6 lg:px-10 pb-20">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <p className="mono-label mb-3">Ideal partners</p>
              <h2 className="text-3xl font-bold text-text mb-6">Who we're looking for</h2>
              <p className="text-text-muted text-sm mb-5">We partner with creators and communities in:</p>
              <ul className="space-y-3">
                {NICHES.map(niche => (
                  <li key={niche} className="flex items-center gap-2.5 text-sm text-text-muted">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    {niche}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card rounded-xl p-6">
              <h3 className="font-bold text-text mb-3">Minimum requirements</h3>
              <p className="text-text-muted text-sm leading-relaxed mb-5">
                Active content creation or community with <strong className="text-text">1,000+ engaged followers</strong>. We value engagement over follower count.
              </p>
              <div className="space-y-3">
                {[
                  'Consistent, trading-related content',
                  'Genuine audience engagement',
                  'Alignment with trader values',
                  'Any country or region',
                ].map(req => (
                  <div key={req} className="flex items-center gap-2.5 text-sm text-text-muted">
                    <Check size={13} className="text-accent shrink-0" />
                    {req}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Application Form ──────────────────────────────────── */}
        <section id="apply" className="max-w-2xl mx-auto px-6 lg:px-10 pb-24">
          <p className="mono-label text-center mb-3">Apply now</p>
          <h2 className="text-3xl font-bold text-text text-center mb-3">Ready to partner?</h2>
          <p className="text-text-muted text-center text-sm mb-10">
            Applications are reviewed within 48 hours. We'll email you with next steps.
          </p>

          {success ? (
            <div className="card rounded-xl p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-signal-green/10 border border-signal-green/30 flex items-center justify-center mx-auto mb-5">
                <Check size={26} className="text-signal-green" strokeWidth={2} />
              </div>
              <h3 className="font-bold text-xl text-text mb-3">Application submitted! 🎉</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                We'll review it and get back to you within 48 hours at{' '}
                <span className="text-accent font-medium">{form.email}</span>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card rounded-xl p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Full Name *">
                  <input
                    name="name" required value={form.name} onChange={update}
                    placeholder="Your full name"
                    className="form-input"
                  />
                </Field>
                <Field label="Email *">
                  <input
                    name="email" type="email" required value={form.email} onChange={update}
                    placeholder="you@example.com"
                    className="form-input"
                  />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Platform *">
                  <select name="platform" required value={form.platform} onChange={update} className="form-input">
                    <option value="">Select platform…</option>
                    <option value="youtube">YouTube</option>
                    <option value="twitter">Twitter/X</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="blog">Blog/Website</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Audience Size *">
                  <select name="audience_size" required value={form.audience_size} onChange={update} className="form-input">
                    <option value="">Select size…</option>
                    <option value="Under 1K">Under 1K</option>
                    <option value="1K-5K">1K–5K</option>
                    <option value="5K-10K">5K–10K</option>
                    <option value="10K-50K">10K–50K</option>
                    <option value="50K-100K">50K–100K</option>
                    <option value="100K+">100K+</option>
                  </select>
                </Field>
              </div>

              <Field label="Channel / Page URL *">
                <input
                  name="channel_url" required value={form.channel_url} onChange={update}
                  placeholder="https://youtube.com/@yourchannel"
                  className="form-input"
                />
              </Field>

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Niche *">
                  <select name="niche" required value={form.niche} onChange={update} className="form-input">
                    <option value="">Select niche…</option>
                    <option value="forex">Forex</option>
                    <option value="crypto">Crypto</option>
                    <option value="stocks">Stocks</option>
                    <option value="general trading">General Trading</option>
                    <option value="prop firms">Prop Firms</option>
                    <option value="financial literacy">Financial Literacy</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Country">
                  <input
                    name="country" value={form.country} onChange={update}
                    placeholder="e.g. Kenya, Nigeria, UK…"
                    className="form-input"
                  />
                </Field>
              </div>

              <Field label="Why do you want to partner with TradeLog Pro?">
                <textarea
                  name="message" value={form.message} onChange={update} rows={4}
                  placeholder="Tell us about your audience and how you'd promote TradeLog Pro…"
                  className="form-input resize-none"
                />
              </Field>

              {error && (
                <div className="flex items-center gap-2 text-signal-red text-sm bg-signal-red/5 border border-signal-red/20 rounded-lg px-4 py-3">
                  <AlertTriangle size={14} className="shrink-0" />
                  {error}
                </div>
              )}

              <button type="submit" disabled={submitting} className="btn-primary w-full gap-2 justify-center">
                {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                {submitting ? 'Submitting…' : 'Submit Application'}
              </button>
            </form>
          )}

          <p className="text-center text-text-dim text-xs mt-8">
            Have questions about the program?{' '}
            <a href="/contact" className="text-accent hover:underline">Contact us</a>
          </p>
        </section>

      </main>
      <Footer />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-text-muted mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
