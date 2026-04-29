'use client';

import Link from 'next/link';
import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';

const TICKER_DATA = [
  { sym: 'BTC',    px: '94,812', chg: '+2.41%', up: true  },
  { sym: 'ETH',    px: '3,284',  chg: '-0.87%', up: false },
  { sym: 'EURUSD', px: '1.0834', chg: '+0.12%', up: true  },
  { sym: 'GBPJPY', px: '193.21', chg: '-0.34%', up: false },
  { sym: 'XAUUSD', px: '2,742',  chg: '+0.94%', up: true  },
  { sym: 'SOL',    px: '178.45', chg: '+5.12%', up: true  },
  { sym: 'NAS100', px: '20,847', chg: '+0.61%', up: true  },
  { sym: 'USDJPY', px: '154.28', chg: '-0.22%', up: false },
];

const SIDEBAR_NAV = [
  { label: 'Overview',  active: true  },
  { label: 'Journal',   active: false },
  { label: 'Analytics', active: false },
  { label: 'AI Coach',  active: false },
];

const KPIS = [
  { label: 'Net P&L',   val: '+$3,847', sub: '+12.8% this month', up: true  },
  { label: 'Win Rate',  val: '64.2%',   sub: '+4.1pp vs last mo', up: true  },
  { label: 'Avg R',     val: '1.84R',   sub: 'risk-adjusted',     up: true  },
  { label: 'Drawdown',  val: '−4.1%',   sub: 'max open DD',       up: false },
];

const STRATEGIES = [
  { name: 'Breakout',   pnl: '+$1,847', pct: 78, pos: true  },
  { name: 'Trend',      pnl: '+$1,240', pct: 55, pos: true  },
  { name: 'Mean Rev.',  pnl: '+$512',   pct: 34, pos: true  },
  { name: 'News',       pnl: '−$1,213', pct: 20, pos: false },
];

const TRADES = [
  { sym: 'BTC/USDT', strat: 'Breakout', dir: 'Long',  pl: '+$284', r: '+2.1R', up: true  },
  { sym: 'EUR/USD',  strat: 'News',     dir: 'Short', pl: '−$92',  r: '−0.7R', up: false },
  { sym: 'SOL/USDT', strat: 'Trend',    dir: 'Long',  pl: '+$412', r: '+3.2R', up: true  },
];

export default function Hero() {
  return (
    <section className="relative pt-24 pb-0 overflow-hidden grid-bg">
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg/60 via-transparent to-bg pointer-events-none z-0" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg/70 via-transparent to-bg/70 pointer-events-none z-0" />

      <div className="relative z-10">

        {/* ── Copy block ── centered, compact */}
        <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center pb-14">

          {/* Live badge */}
          <div className="inline-flex items-center gap-2 border border-accent/25 bg-accent/[0.06] px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-green animate-pulse shrink-0" />
            <span className="font-mono text-[10px] tracking-[0.14em] text-text-dim uppercase">
              Live · 247 traders journaling now
            </span>
          </div>

          {/* Headline — capped at text-5xl */}
          <h1 className="text-5xl font-bold leading-[1.06] tracking-tight text-text mb-5">
            Know why you <span className="text-signal-green">win.</span>{' '}
            Know why you <span className="text-signal-red">lose.</span>
          </h1>

          <p className="text-text-muted text-base leading-relaxed mb-8 max-w-lg mx-auto">
            The professional trading journal for crypto, forex, and equities.
            AI coaching that surfaces the patterns your eyes miss.
          </p>

          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <Link href="/signup" className="btn-primary group">
              Start free trial
              <ArrowUpRight
                className="ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                size={16}
              />
            </Link>
            <Link href="/coach" className="btn-secondary">
              See AI Coach
            </Link>
          </div>

          <p className="font-mono text-[10px] tracking-[0.13em] text-text-dim uppercase">
            No credit card · 4-day trial · Global payments accepted
          </p>
        </div>

        {/* ── Dashboard mockup ── full-width, product-forward */}
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Ambient glow underneath */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-accent/[0.07] blur-3xl rounded-full pointer-events-none" />

          {/* Browser frame — open at bottom (no border-b) to bleed into ticker */}
          <div className="relative rounded-t-xl border border-border border-b-0 overflow-hidden shadow-[0_0_80px_rgba(0,217,255,0.07),0_-4px_40px_rgba(0,217,255,0.05)]">

            {/* Tab bar */}
            <div className="bg-bg border-b border-border px-4 py-2.5 flex items-center gap-3">
              <div className="flex gap-1.5 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-[#1F1F23]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#1F1F23]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#1F1F23]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-bg-elevated border border-border rounded-md px-3 py-1 inline-flex items-center gap-2 w-56">
                  <div className="w-1.5 h-1.5 rounded-full bg-signal-green shrink-0" />
                  <span className="font-mono text-[10px] text-text-dim tracking-wider">
                    tradelog.pro/dashboard
                  </span>
                </div>
              </div>
              <span className="font-mono text-[9px] tracking-[0.14em] text-accent uppercase shrink-0 hidden sm:block">
                Live Preview
              </span>
            </div>

            {/* App shell */}
            <div className="flex bg-bg" style={{ minHeight: '440px' }}>

              {/* Sidebar */}
              <div className="w-52 shrink-0 border-r border-border bg-[#0A0A0B] hidden md:flex flex-col">
                {/* Logo */}
                <div className="px-4 py-3.5 border-b border-border flex items-center gap-2.5">
                  <div className="w-6 h-6 bg-accent rounded-[3px] flex items-center justify-center shrink-0">
                    <span className="font-mono text-[8px] font-black text-bg">TLP</span>
                  </div>
                  <span className="font-bold text-sm text-text">
                    TradeLog<span className="text-accent">Pro</span>
                  </span>
                </div>
                {/* Nav */}
                <nav className="flex-1 px-2 py-3 space-y-0.5">
                  {SIDEBAR_NAV.map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded text-[11px] tracking-wide ${
                        item.active
                          ? 'bg-accent/10 text-accent border-l-2 border-accent ml-[-1px] pl-[11px]'
                          : 'text-text-dim'
                      }`}
                    >
                      <div className={`w-1 h-1 rounded-full shrink-0 ${item.active ? 'bg-accent' : 'bg-[#27272A]'}`} />
                      <span className="font-mono">{item.label}</span>
                    </div>
                  ))}
                </nav>
                {/* Footer */}
                <div className="px-2 py-3 border-t border-border">
                  {['Settings', 'Sign out'].map((label) => (
                    <div key={label} className="flex items-center gap-2.5 px-3 py-2 rounded text-[11px] text-text-dim">
                      <div className="w-1 h-1 rounded-full bg-[#1F1F23] shrink-0" />
                      <span className="font-mono tracking-wide">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main panel */}
              <div className="flex-1 p-4 md:p-5 space-y-3.5 min-w-0 bg-bg-surface">

                {/* Page header */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-mono text-[9px] tracking-[0.15em] text-text-dim uppercase mb-1">
                      Tuesday, April 29, 2026
                    </div>
                    <div className="font-bold text-sm text-text tracking-tight">
                      Welcome back, <span className="text-accent">Alex</span>.
                    </div>
                  </div>
                  <div className="font-mono text-[9px] tracking-[0.12em] text-bg uppercase bg-accent px-3 py-1.5 rounded font-bold shrink-0">
                    + Log Trade
                  </div>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {KPIS.map((k, i) => (
                    <div key={i} className="border border-border rounded-lg p-3 bg-bg">
                      <div className="font-mono text-[8px] tracking-[0.14em] text-text-dim uppercase mb-1.5">
                        {k.label}
                      </div>
                      <div className="font-mono text-base font-bold text-text tabular leading-none mb-1">
                        {k.val}
                      </div>
                      <div className={`font-mono text-[9px] tabular ${k.up ? 'text-signal-green' : 'text-signal-red'}`}>
                        {k.up ? '▲' : '▼'} {k.sub}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart row */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">

                  {/* Equity curve */}
                  <div className="lg:col-span-3 border border-border rounded-lg p-4 bg-bg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-[9px] tracking-[0.14em] text-text-dim uppercase">
                        P&L Curve · 30d
                      </span>
                      <span className="font-mono text-xs font-bold text-accent tabular">+$3,847</span>
                    </div>
                    <svg viewBox="0 0 480 80" className="w-full h-16" aria-hidden="true">
                      <defs>
                        <linearGradient id="hero-grad" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#00D9FF" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {[20, 40, 60].map((y) => (
                        <line key={y} x1="0" x2="480" y1={y} y2={y} stroke="#1F1F23" strokeWidth="0.5" />
                      ))}
                      <path
                        d="M0,72 L33,70 L66,71 L99,62 L132,67 L165,52 L198,59 L231,43 L264,49 L297,34 L330,40 L363,25 L396,29 L429,15 L462,19 L480,10"
                        fill="none" stroke="#00D9FF" strokeWidth="1.5"
                      />
                      <path
                        d="M0,72 L33,70 L66,71 L99,62 L132,67 L165,52 L198,59 L231,43 L264,49 L297,34 L330,40 L363,25 L396,29 L429,15 L462,19 L480,10 L480,80 L0,80 Z"
                        fill="url(#hero-grad)"
                      />
                      <circle cx="480" cy="10" r="3" fill="#00D9FF" />
                      <circle cx="480" cy="10" r="7" fill="#00D9FF" opacity="0.2" />
                    </svg>
                  </div>

                  {/* Strategy breakdown */}
                  <div className="lg:col-span-2 border border-border rounded-lg p-4 bg-bg">
                    <div className="font-mono text-[9px] tracking-[0.14em] text-text-dim uppercase mb-3.5">
                      P&L by Strategy
                    </div>
                    {STRATEGIES.map((s, i) => (
                      <div key={i} className="mb-3 last:mb-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[10px] text-text-muted">{s.name}</span>
                          <span className={`font-mono text-[10px] font-bold tabular ${s.pos ? 'text-signal-green' : 'text-signal-red'}`}>
                            {s.pnl}
                          </span>
                        </div>
                        <div className="h-px bg-bg-elevated rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${s.pos ? 'bg-signal-green' : 'bg-signal-red'}`}
                            style={{ width: `${s.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent trades table */}
                <div className="border border-border rounded-lg overflow-hidden bg-bg">
                  <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-bg-surface">
                    <span className="font-mono text-[9px] tracking-[0.14em] text-text-dim uppercase">
                      Recent Trades
                    </span>
                    <span className="font-mono text-[9px] tracking-widest text-accent uppercase">
                      View all →
                    </span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {TRADES.map((t, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="font-mono text-xs text-text w-[72px] shrink-0">{t.sym}</span>
                        <span className="font-mono text-[9px] tracking-wider text-text-dim uppercase px-1.5 py-0.5 border border-border rounded shrink-0">
                          {t.strat}
                        </span>
                        <span className="font-mono text-[10px] text-text-dim hidden sm:block">{t.dir}</span>
                        <span className="font-mono text-[10px] text-text-dim tabular ml-auto hidden sm:block">
                          {t.r}
                        </span>
                        <span className={`font-mono text-xs font-bold tabular ${t.up ? 'text-signal-green' : 'text-signal-red'}`}>
                          {t.pl}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Fade the bottom of the mockup into the page */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-bg to-transparent pointer-events-none" />
        </div>

        {/* Ticker tape */}
        <div className="border-t border-border bg-bg py-2.5 overflow-hidden">
          <div className="ticker-track gap-10 px-6">
            {[...TICKER_DATA, ...TICKER_DATA, ...TICKER_DATA].map((t, i) => (
              <div key={i} className="flex items-center gap-2.5 shrink-0">
                <span className="font-mono text-[10px] tracking-widest text-text-dim">{t.sym}</span>
                <span className="font-mono text-[11px] text-text tabular">{t.px}</span>
                <span className={`font-mono text-[10px] tabular flex items-center gap-1 ${t.up ? 'text-signal-green' : 'text-signal-red'}`}>
                  {t.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                  {t.chg}
                </span>
                <span className="text-text-dim/30">·</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
