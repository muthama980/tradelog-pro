import { TrendingUp, TrendingDown } from 'lucide-react';

export default function ProductShowcase() {
  return (
    <section className="relative py-24 px-6 lg:px-10 bg-bg overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-14 items-center">
          {/* Left — copy */}
          <div className="lg:col-span-5">
            <p className="mono-label mb-4">The Dashboard</p>
            <h2 className="text-3xl md:text-4xl font-bold text-text tracking-tight mb-5">
              The numbers{' '}
              <span className="text-accent">don't lie.</span>
            </h2>
            <p className="text-text-muted leading-relaxed mb-8 text-sm">
              Every chart on your dashboard is a question your edge has to answer. What strategy is paying you?
              Which day of the week destroys you? Where is the leak?
            </p>
            <div className="space-y-4">
              {[
                { num: '01', label: 'Win rate by strategy tag' },
                { num: '02', label: 'Cumulative R-multiple curve' },
                { num: '03', label: 'Drawdown depth & recovery' },
                { num: '04', label: 'Time-of-day performance heatmap' },
              ].map((item) => (
                <div key={item.num} className="flex items-center gap-4 group">
                  <span className="font-mono text-[11px] text-accent tracking-wider tabular">{item.num}</span>
                  <div className="h-px flex-1 bg-border group-hover:bg-accent/30 transition-colors" />
                  <span className="text-sm text-text-muted group-hover:text-text transition-colors">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — mock dashboard */}
          <div className="lg:col-span-7">
            <div className="relative">
              <div className="absolute -inset-6 bg-accent/[0.03] blur-3xl rounded-full" />
              <div className="relative card rounded-xl overflow-hidden">
                {/* Chrome */}
                <div className="border-b border-border px-5 py-3 flex items-center gap-3 bg-bg">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-bg-elevated" />
                    <div className="w-2.5 h-2.5 rounded-full bg-bg-elevated" />
                    <div className="w-2.5 h-2.5 rounded-full bg-bg-elevated" />
                  </div>
                  <div className="font-mono text-[11px] tracking-wider text-text-dim ml-3">
                    tradelog.xyz/dashboard
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="p-6 md:p-7 space-y-5 bg-bg-surface">
                  {/* KPIs */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Win Rate', val: '64.2%',  chg: '+4.1%',  up: true  },
                      { label: 'Net P&L',  val: '$3,847', chg: '+12.8%', up: true  },
                      { label: 'Avg R',    val: '1.84R',  chg: '-0.2',   up: false },
                    ].map((k, i) => (
                      <div key={i} className="border border-border rounded-lg p-4 bg-bg">
                        <div className="font-mono text-[9px] tracking-widest text-text-dim uppercase mb-2">{k.label}</div>
                        <div className="font-mono text-xl font-bold text-text tabular">{k.val}</div>
                        <div className={`font-mono text-[10px] mt-1.5 flex items-center gap-1 ${k.up ? 'text-signal-green' : 'text-signal-red'}`}>
                          {k.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {k.chg}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chart */}
                  <div className="border border-border rounded-lg bg-bg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-mono text-[9px] tracking-widest text-text-dim uppercase">Cumulative P&L · Last 30 Days</div>
                      <div className="font-mono text-xs font-bold text-accent">+$3,847.24</div>
                    </div>
                    <svg viewBox="0 0 600 160" className="w-full h-28">
                      <defs>
                        <linearGradient id="grad-showcase" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#00D9FF" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,130 L40,125 L80,132 L120,110 L160,118 L200,95 L240,108 L280,80 L320,88 L360,65 L400,72 L440,50 L480,55 L520,32 L560,38 L600,20"
                        fill="none"
                        stroke="#00D9FF"
                        strokeWidth="2"
                      />
                      <path
                        d="M0,130 L40,125 L80,132 L120,110 L160,118 L200,95 L240,108 L280,80 L320,88 L360,65 L400,72 L440,50 L480,55 L520,32 L560,38 L600,20 L600,160 L0,160 Z"
                        fill="url(#grad-showcase)"
                      />
                    </svg>
                  </div>

                  {/* Recent trades */}
                  <div className="border border-border rounded-lg overflow-hidden bg-bg">
                    <div className="px-4 py-2.5 border-b border-border font-mono text-[9px] tracking-widest text-text-dim uppercase">
                      Recent Trades
                    </div>
                    {[
                      { sym: 'BTC/USDT', strat: 'Breakout',  pl: '+$284', up: true  },
                      { sym: 'EUR/USD',  strat: 'Mean Rev.', pl: '-$92',  up: false },
                      { sym: 'SOL/USDT', strat: 'Trend',     pl: '+$412', up: true  },
                    ].map((t, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="font-mono text-xs text-text">{t.sym}</div>
                          <div className="font-mono text-[9px] uppercase tracking-widest text-text-dim px-2 py-0.5 border border-border rounded">
                            {t.strat}
                          </div>
                        </div>
                        <div className={`font-mono text-sm font-bold tabular ${t.up ? 'text-signal-green' : 'text-signal-red'}`}>
                          {t.pl}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
