import { LineChart, Brain, Database, ShieldCheck, Tags, Zap } from 'lucide-react';

const FEATURES = [
  {
    icon: Database,
    title: 'Frictionless Trade Capture',
    body: "Log entries, exits, position size, fees, screenshots, and notes in seconds. Designed for traders who don't have time for clunky software.",
    num: '01',
  },
  {
    icon: Tags,
    title: 'Strategy Tagging',
    body: 'Tag every trade with a strategy — breakout, mean reversion, scalp. Discover which playbook actually pays you, and which one bleeds you slowly.',
    num: '02',
  },
  {
    icon: LineChart,
    title: 'Edge Analytics',
    body: 'Win rate, expectancy, R-multiples, drawdown curves, time-of-day performance. The numbers a professional needs. Nothing decorative.',
    num: '03',
  },
  {
    icon: Brain,
    title: 'The AI Coach',
    body: "Reviews your journal weekly. Surfaces emotional patterns you can't see yourself. Tells you, plainly, where the leaks are.",
    num: '04',
  },
  {
    icon: Zap,
    title: 'Crypto-Native',
    body: 'BTC, ETH, altcoins, futures, DeFi. Binance and Bybit CSV import. Built by a trader who lives in these markets — not a US fintech.',
    num: '05',
  },
  {
    icon: ShieldCheck,
    title: 'Your Data Is Yours',
    body: "Export everything as CSV anytime. We don't sell your trade history. Your edge stays your edge.",
    num: '06',
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-24 px-6 lg:px-10 bg-bg">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-14">
          <p className="mono-label mb-4">Product · Features</p>
          <h2 className="text-3xl md:text-4xl font-bold text-text tracking-tight max-w-xl">
            Everything a serious trader needs.{' '}
            <span className="text-text-muted font-medium">Nothing they don't.</span>
          </h2>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border rounded-lg overflow-hidden">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="group bg-bg-surface p-7 hover:bg-bg-elevated transition-colors duration-300 relative"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-10 h-10 border border-border rounded-lg flex items-center justify-center group-hover:border-accent/40 group-hover:bg-accent/5 transition-all">
                    <Icon className="text-accent" size={18} strokeWidth={1.5} />
                  </div>
                  <span className="font-mono text-[11px] text-text-dim tabular">{f.num}</span>
                </div>
                <h3 className="font-bold text-lg text-text mb-3 tracking-tight">
                  {f.title}
                </h3>
                <p className="text-text-muted leading-relaxed text-[14px]">
                  {f.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
