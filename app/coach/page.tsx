import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { Brain, TrendingUp, TrendingDown, Sparkles, ArrowUpRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function CoachPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20 bg-bg">
        {/* Hero */}
        <section className="relative px-6 lg:px-10 mb-20 grid-bg">
          <div className="absolute inset-0 bg-gradient-to-b from-bg/80 via-transparent to-bg pointer-events-none" />
          <div className="max-w-7xl mx-auto relative pb-20 pt-4">
            <p className="mono-label mb-5">The AI Coach</p>
            <h1 className="text-4xl md:text-5xl font-bold leading-[1.08] tracking-tight text-text max-w-3xl mb-8">
              An analyst who reads every trade you make.
            </h1>
            <p className="text-text-muted max-w-xl leading-relaxed mb-10">
              Every Sunday, the Coach reviews your week. It surfaces patterns no human could catch by eye —
              the leaks, the hot streaks, the emotional traps. Plain language. Actionable. Honest.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup?plan=pro" className="btn-primary group">
                Begin trial — Pro plan
                <ArrowUpRight className="ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" size={17} />
              </Link>
              <Link href="/pricing" className="btn-secondary">See pricing</Link>
            </div>
          </div>
        </section>

        {/* Sample report */}
        <section className="px-6 lg:px-10 mb-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <p className="mono-label mb-3">A Sample Weekly Report</p>
              <h2 className="text-3xl font-bold text-text tracking-tight">
                What you'll see every Sunday.
              </h2>
            </div>

            <div className="card rounded-xl overflow-hidden">
              {/* Report header */}
              <div className="border-b border-border p-6 md:p-7 bg-bg-elevated">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <Brain className="text-accent" size={16} />
                      <span className="mono-label tracking-widest">Weekly Coach Report</span>
                    </div>
                    <h3 className="font-bold text-xl text-text">Week of October 21–27, 2026</h3>
                  </div>
                  <div className="text-right">
                    <div className="mono-label mb-1">Trades Reviewed</div>
                    <div className="font-mono text-3xl font-bold tabular text-accent">23</div>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-7 space-y-7">
                {/* TL;DR */}
                <div>
                  <div className="mono-label mb-3">Executive Summary</div>
                  <p className="text-lg text-text leading-relaxed font-medium">
                    A profitable week, but one that hides a structural problem.
                    Your <span className="text-accent font-bold">breakout strategy</span> is doing the heavy lifting,
                    while your <span className="text-signal-red font-bold">news trades</span> bled most of those gains back.
                  </p>
                </div>

                <div className="divider" />

                {/* Pattern 1 — Win */}
                <div className="grid md:grid-cols-12 gap-5">
                  <div className="md:col-span-1">
                    <div className="w-10 h-10 border border-signal-green/30 bg-signal-green/10 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="text-signal-green" size={17} />
                    </div>
                  </div>
                  <div className="md:col-span-11">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-mono text-[10px] tracking-widest text-signal-green uppercase">Pattern 01 · Working</span>
                      <span className="mono-label">Confidence: high</span>
                    </div>
                    <h4 className="font-bold text-lg text-text mb-3">Breakouts on BTC and SOL paid you 9 of 11 times.</h4>
                    <p className="text-text-muted leading-relaxed mb-4 text-sm">
                      Your breakout setup posted +2.4R average across 11 trades, win rate 81%. The pattern holds
                      strongest on BTC and SOL during the Asian session. Whatever discipline you're applying here — keep applying it.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <Stat label="Win Rate" value="81%" up />
                      <Stat label="Avg R" value="+2.4R" up />
                      <Stat label="Net P&L" value="+$1,847" up />
                    </div>
                  </div>
                </div>

                <div className="divider" />

                {/* Pattern 2 — Loss */}
                <div className="grid md:grid-cols-12 gap-5">
                  <div className="md:col-span-1">
                    <div className="w-10 h-10 border border-signal-red/30 bg-signal-red/10 rounded-lg flex items-center justify-center">
                      <AlertCircle className="text-signal-red" size={17} />
                    </div>
                  </div>
                  <div className="md:col-span-11">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-mono text-[10px] tracking-widest text-signal-red uppercase">Pattern 02 · Leaking</span>
                      <span className="mono-label">Confidence: very high</span>
                    </div>
                    <h4 className="font-bold text-lg text-text mb-3">Your news trades have a -1.8R expectancy. Stop.</h4>
                    <p className="text-text-muted leading-relaxed mb-4 text-sm">
                      Across 8 news-driven trades this week, you went 2-6 with a -1.8R average. This is the third
                      consecutive week showing this pattern. Suggested action: drop news trades entirely until you can demonstrate a positive
                      expectancy in a small-size sandbox.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <Stat label="Win Rate" value="25%" />
                      <Stat label="Avg R" value="-1.8R" />
                      <Stat label="Net P&L" value="-$1,213" />
                    </div>
                  </div>
                </div>

                <div className="divider" />

                {/* Pattern 3 — Emotion */}
                <div className="grid md:grid-cols-12 gap-5">
                  <div className="md:col-span-1">
                    <div className="w-10 h-10 border border-accent/30 bg-accent/5 rounded-lg flex items-center justify-center">
                      <Sparkles className="text-accent" size={17} />
                    </div>
                  </div>
                  <div className="md:col-span-11">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-mono text-[10px] tracking-widest text-accent uppercase">Pattern 03 · Hidden</span>
                      <span className="mono-label">Confidence: medium</span>
                    </div>
                    <h4 className="font-bold text-lg text-text mb-3">Trades you tagged "FOMO" lost money 7 of 8 times.</h4>
                    <p className="text-text-muted leading-relaxed text-sm">
                      You're already aware enough to tag the emotion. The next discipline is to walk away when you feel it.
                      A 30-second pause between feeling FOMO and clicking buy would have saved $640 this week alone.
                    </p>
                  </div>
                </div>

                <div className="divider" />

                <div className="text-center py-2">
                  <p className="font-bold text-base text-accent">
                    You're 18% more profitable than last week. The leak is news trades. Plug it.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-5 mono-label text-center tracking-wider">
              Sample report · Your real one is built from your real trades
            </p>
          </div>
        </section>

        {/* What it does / doesn't */}
        <section className="px-6 lg:px-10 mb-20">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="card rounded-xl p-8">
                <h3 className="font-bold text-xl text-text mb-6">
                  <span className="text-signal-green">What it does</span>
                </h3>
                <ul className="space-y-4">
                  {[
                    'Reads every trade in your journal',
                    "Identifies which strategies are profitable, which aren't",
                    "Spots emotional patterns you can't see in yourself",
                    'Compares your week vs your prior weeks',
                    'Highlights time-of-day and day-of-week edges',
                    'Writes plainly, in English, with specific numbers',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="text-signal-green shrink-0 mt-0.5" size={16} />
                      <span className="text-text-muted text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card rounded-xl p-8">
                <h3 className="font-bold text-xl text-text mb-6">
                  <span className="text-signal-red">What it doesn't do</span>
                </h3>
                <ul className="space-y-4">
                  {[
                    'Predict future prices',
                    'Tell you what to buy or sell',
                    'Offer financial advice',
                    'Send signals or alerts on live trades',
                    'Replace your own judgment',
                    "Pretend it knows the market — it knows you",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-signal-red shrink-0 font-bold text-base leading-none mt-0.5">×</span>
                      <span className="text-text-muted text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 lg:px-10">
          <div className="max-w-3xl mx-auto text-center card rounded-xl p-10">
            <p className="font-bold text-2xl text-text mb-2">
              The most expensive thing in trading isn't a wrong trade.
            </p>
            <p className="text-text-muted mb-8">It's the same wrong trade, made twice.</p>
            <Link href="/signup?plan=pro" className="btn-primary">
              Try AI Coach free for 4 days
            </Link>
            <p className="mt-4 mono-label tracking-wider">
              AI Coach · Included in Pro
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Stat({ label, value, up }: { label: string; value: string; up?: boolean }) {
  return (
    <div className="border border-border rounded-lg bg-bg p-3">
      <div className="mono-label mb-1 text-[9px]">{label}</div>
      <div className={`font-mono text-sm font-bold tabular flex items-center gap-1 ${up ? 'text-signal-green' : 'text-signal-red'}`}>
        {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {value}
      </div>
    </div>
  );
}
