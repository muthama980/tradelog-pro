'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'Is this really free for four days?',
    a: 'Yes. No credit card required to start. After your trial, you choose to subscribe or your data sits safely waiting if you ever return.',
  },
  {
    q: 'Which exchanges and brokers are supported?',
    a: 'CSV import works for Binance, Bybit, MetaTrader 4/5, and most major brokers. Manual entry takes 30 seconds per trade. Direct API integrations are on the roadmap for late 2026.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit and debit cards via Lemon Squeezy. More payment options coming soon.',
  },
  {
    q: 'How does the AI Coach actually work?',
    a: 'Once a week, it analyzes your last 30 trades — the strategies tagged, the times you traded, the size you used, the notes you wrote — and surfaces concrete patterns. It does not give trading advice. It gives you back your own data, organized.',
  },
  {
    q: 'Can I export my trades?',
    a: 'Anytime. CSV download is one click and covers your entire history. We believe your trade history belongs to you, not us.',
  },
  {
    q: 'Why are you cheaper than Tradervue?',
    a: 'Because we operate with disciplined unit economics and keep our overhead lean. The savings are passed directly to you.',
  },
  {
    q: 'Is this financial advice?',
    a: 'Absolutely not. TradeLog Pro is a record-keeping and analytics tool. Nothing on this platform is financial advice. Trade at your own risk.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="relative py-24 px-6 lg:px-10 bg-bg">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <p className="mono-label mb-4">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-bold text-text tracking-tight">
            Questions,{' '}
            <span className="text-accent">answered.</span>
          </h2>
        </div>

        <div className="space-y-px border border-border rounded-xl overflow-hidden">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="bg-bg-surface border-b border-border last:border-0">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-5 md:p-6 text-left hover:bg-bg-elevated transition-colors"
              >
                <span className="font-medium text-text pr-4">{item.q}</span>
                <span className="shrink-0 w-8 h-8 border border-border rounded-lg flex items-center justify-center">
                  {open === i
                    ? <Minus size={14} className="text-accent" />
                    : <Plus size={14} className="text-text-dim" />
                  }
                </span>
              </button>
              {open === i && (
                <div className="px-5 md:px-6 pb-6 -mt-1">
                  <div className="divider mb-5" />
                  <p className="text-text-muted leading-relaxed text-sm">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
