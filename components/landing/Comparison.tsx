import { Fragment } from 'react';
import { Check, X, Clock } from 'lucide-react';

const SECTIONS = [
  {
    label: 'Journaling',
    rows: [
      { feature: 'Unlimited trade logging',                     core: true,  pro: true,  elite: true  },
      { feature: 'Strategy & emotion tagging',                  core: true,  pro: true,  elite: true  },
      { feature: 'Mistake tracking',                            core: true,  pro: true,  elite: true  },
      { feature: 'CSV export',                                  core: true,  pro: true,  elite: true  },
      { feature: 'Advanced journal filters',                    core: false, pro: true,  elite: true  },
    ],
  },
  {
    label: 'Analytics',
    rows: [
      { feature: 'Equity curve, win rate, total P&L',           core: true,  pro: true,  elite: true  },
      { feature: 'Daily risk status alerts',                    core: true,  pro: true,  elite: true  },
      { feature: 'Full analytics (strategy, emotion, time)',    core: false, pro: true,  elite: true  },
    ],
  },
  {
    label: 'AI Coach',
    rows: [
      { feature: 'AI Coach weekly reports',                     core: false, pro: true,  elite: true  },
    ],
  },
  {
    label: 'Exchange Connections',
    rows: [
      { feature: 'Exchange connections',                        core: '1',   pro: '∞',   elite: '∞'   },
    ],
  },
  {
    label: 'Portfolio — Elite',
    rows: [
      { feature: 'Portfolio tracker (crypto, stocks, forex)',   core: false, pro: false, elite: 'soon' },
      { feature: 'Real-time portfolio valuation',               core: false, pro: false, elite: 'soon' },
      { feature: 'Asset allocation dashboard',                  core: false, pro: false, elite: 'soon' },
      { feature: 'Watchlist with price alerts',                 core: false, pro: false, elite: 'soon' },
      { feature: 'Dividend & yield tracking',                   core: false, pro: false, elite: 'soon' },
      { feature: 'Staking rewards tracking',                    core: false, pro: false, elite: 'soon' },
      { feature: 'Multi-account support',                       core: false, pro: false, elite: 'soon' },
      { feature: 'Monthly portfolio report',                    core: false, pro: false, elite: 'soon' },
    ],
  },
  {
    label: 'Support',
    rows: [
      { feature: 'Email support',                               core: true,  pro: false, elite: false  },
      { feature: 'Priority support',                            core: false, pro: true,  elite: true   },
    ],
  },
];

type CellValue = boolean | string;

function Cell({ v, highlight }: { v: CellValue; highlight?: boolean }) {
  if (v === true)   return <Check className={`mx-auto ${highlight ? 'text-accent' : 'text-signal-green'}`} size={16} strokeWidth={2.5} />;
  if (v === false)  return <X className="text-text-dim/30 mx-auto" size={16} strokeWidth={2} />;
  if (v === 'soon') return (
    <div className="flex justify-center">
      <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-accent border border-accent/30 rounded px-1.5 py-0.5">
        <Clock size={9} />soon
      </span>
    </div>
  );
  return <span className="font-mono text-sm text-text-muted">{v}</span>;
}

export default function Comparison() {
  return (
    <section className="relative py-24 px-6 lg:px-10 bg-bg-surface">
      <div className="max-w-5xl mx-auto">
        <div className="mb-14">
          <p className="mono-label mb-4">Plan Comparison</p>
          <h2 className="text-3xl md:text-4xl font-bold text-text tracking-tight max-w-xl">
            Everything you get,{' '}
            <span className="text-text-muted font-medium">plan by plan.</span>
          </h2>
          <p className="mt-4 text-text-muted text-sm leading-relaxed max-w-2xl">
            No hidden limits. Every feature listed is available from day one of your free trial.
          </p>
        </div>

        <div className="card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-bg-elevated">
                  <th className="text-left p-5 font-mono text-[10px] tracking-widest text-text-dim uppercase w-1/2">Feature</th>
                  <th className="p-5 text-center font-mono text-[10px] tracking-widest text-text-dim uppercase">
                    Core<br /><span className="font-mono text-[9px] text-text-dim/50 tracking-normal normal-case">$19/mo</span>
                  </th>
                  <th className="p-5 text-center font-mono text-[10px] tracking-widest uppercase bg-accent/[0.03]">
                    <span className="text-accent">Pro</span><br /><span className="font-mono text-[9px] text-text-dim/50 tracking-normal normal-case">$25/mo</span>
                  </th>
                  <th className="p-5 text-center font-mono text-[10px] tracking-widest text-text-dim uppercase">
                    Elite<br /><span className="font-mono text-[9px] text-text-dim/50 tracking-normal normal-case">$40/mo</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {SECTIONS.map((section) => (
                  <Fragment key={section.label}>
                    <tr className="bg-bg-elevated/40 border-b border-t border-border">
                      <td colSpan={4} className="px-5 py-2">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim">{section.label}</span>
                      </td>
                    </tr>
                    {section.rows.map((row, i) => (
                      <tr key={row.feature} className={`border-b border-border/50 ${i % 2 !== 0 ? 'bg-bg-surface/30' : ''}`}>
                        <td className="p-5 text-sm text-text-muted">{row.feature}</td>
                        <td className="p-5 text-center"><Cell v={row.core} /></td>
                        <td className="p-5 text-center bg-accent/[0.03]"><Cell v={row.pro} highlight /></td>
                        <td className="p-5 text-center"><Cell v={row.elite} /></td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-5 mono-label text-center tracking-wider">
          ✓ included · ✕ not in this tier · soon = launching with Elite
        </p>
      </div>
    </section>
  );
}
