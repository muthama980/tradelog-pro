'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Brain, Sparkles, CheckCircle2, AlertCircle, TrendingUp, TrendingDown,
  Loader2, ArrowUpRight, Lock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Pattern {
  type: 'working' | 'leaking' | 'hidden';
  title: string;
  body: string;
  stats: { winRate: string; avgR: string; netPnl: string };
}

interface Report {
  summary: string;
  patterns: Pattern[];
  closing: string;
  week_start?: string;
}

// ── Teaser insights computed from real trades ──────────────────────────────

function computeInsights(trades: any[]): string[] {
  if (trades.length === 0) return ["Log your first trades to see personalised insights here."];

  const insights: string[] = [];

  // Most traded symbol
  const symbolCounts: Record<string, number> = {};
  trades.forEach(t => { symbolCounts[t.symbol] = (symbolCounts[t.symbol] || 0) + 1; });
  const topSymbol = Object.entries(symbolCounts).sort((a, b) => b[1] - a[1])[0];
  if (topSymbol) insights.push(`Your most traded symbol is ${topSymbol[0]} (${topSymbol[1]} trade${topSymbol[1] > 1 ? 's' : ''})`);

  // Revenge / negative emotion trades this week
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const revengeCount = trades.filter(
    t => t.emotion === 'revenge' && new Date(t.opened_at).getTime() > weekAgo
  ).length;
  if (revengeCount > 0) {
    insights.push(`You've tagged revenge on ${revengeCount} trade${revengeCount > 1 ? 's' : ''} this week`);
  }

  // Win rate
  const winRate = trades.filter(t => Number(t.pnl) > 0).length / trades.length * 100;
  insights.push(`Win rate across your last ${trades.length} closed trades: ${winRate.toFixed(0)}%`);

  return insights.slice(0, 3);
}

// ── Teaser line for above the blur ────────────────────────────────────────

function computeTeaserLine(trades: any[]): string | null {
  if (trades.length < 3) return null;

  const byStrat: Record<string, { pnl: number; count: number; wins: number }> = {};
  trades.forEach((t: any) => {
    const s = t.strategy || 'untagged';
    byStrat[s] = byStrat[s] || { pnl: 0, count: 0, wins: 0 };
    byStrat[s].pnl   += Number(t.pnl || 0);
    byStrat[s].count += 1;
    if (Number(t.pnl) > 0) byStrat[s].wins += 1;
  });

  const sorted = Object.entries(byStrat).sort((a, b) => b[1].pnl - a[1].pnl);
  if (sorted.length >= 2) {
    const [topName, topData] = sorted[0];
    const avgR = (topData.pnl / topData.count).toFixed(1);
    const sign = Number(avgR) >= 0 ? '+' : '';
    return `Your ${topName} trades are ${sign}${avgR}R — but we found a pattern that's costing you money...`;
  }

  return `We found patterns in your last ${trades.length} trades — upgrade to see the full analysis.`;
}

// ── Pattern card ──────────────────────────────────────────────────────────

function PatternCard({ pattern }: { pattern: Pattern }) {
  const isWorking = pattern.type === 'working';
  const isHidden  = pattern.type === 'hidden';

  return (
    <div className="grid md:grid-cols-12 gap-5">
      <div className="md:col-span-1">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
          isWorking ? 'border-signal-green/30 bg-signal-green/10' :
          isHidden  ? 'border-accent/30 bg-accent/5' :
                      'border-signal-red/30 bg-signal-red/10'
        }`}>
          {isWorking ? <CheckCircle2 className="text-signal-green" size={17} /> :
           isHidden  ? <Sparkles className="text-accent" size={17} /> :
                       <AlertCircle className="text-signal-red" size={17} />}
        </div>
      </div>
      <div className="md:col-span-11">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className={`font-mono text-[10px] tracking-widest uppercase ${
            isWorking ? 'text-signal-green' : isHidden ? 'text-accent' : 'text-signal-red'
          }`}>
            {isWorking ? '· Working' : isHidden ? '· Hidden' : '· Leaking'}
          </span>
        </div>
        <h4 className="font-bold text-lg text-text mb-3">{pattern.title}</h4>
        <p className="text-text-muted leading-relaxed mb-4 text-sm">{pattern.body}</p>
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="Win Rate" value={pattern.stats.winRate} up={isWorking} />
          <StatBox label="Avg R"    value={pattern.stats.avgR}    up={isWorking} />
          <StatBox label="Net P&L"  value={pattern.stats.netPnl}  up={isWorking} />
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, up }: { label: string; value: string; up?: boolean }) {
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

// ── Full report display ───────────────────────────────────────────────────

function ReportDisplay({ report }: { report: Report }) {
  return (
    <div className="card rounded-xl overflow-hidden">
      <div className="border-b border-border p-6 md:p-7 bg-bg-elevated">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <Brain className="text-accent" size={16} />
              <span className="mono-label tracking-widest">Weekly Coach Report</span>
            </div>
            {report.week_start && (
              <p className="font-mono text-xs text-text-dim mb-1">
                Week of {new Date(report.week_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 md:p-7 space-y-7">
        <div>
          <div className="mono-label mb-3">Executive Summary</div>
          <p className="text-lg text-text leading-relaxed font-medium">{report.summary}</p>
        </div>

        {report.patterns.map((p, i) => (
          <div key={i}>
            <div className="divider mb-7" />
            <PatternCard pattern={p} />
          </div>
        ))}

        {report.closing && (
          <>
            <div className="divider" />
            <div className="text-center py-2">
              <p className="font-bold text-base text-accent">{report.closing}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function CoachDashboardPage() {
  const supabase = createClient();

  const [plan, setPlan]               = useState<string | null>(null);
  const [trades, setTrades]           = useState<any[]>([]);
  const [cachedReport, setCachedReport] = useState<Report | null>(null);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [generating, setGenerating]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: tradeData }, { data: cached }] = await Promise.all([
        supabase.from('profiles').select('plan').eq('id', user.id).single(),
        supabase.from('trades').select('*').eq('user_id', user.id).eq('status', 'closed')
          .order('opened_at', { ascending: false }).limit(10),
        supabase.from('coach_reports').select('*').eq('user_id', user.id)
          .order('week_start', { ascending: false }).limit(1).maybeSingle(),
      ]);

      setPlan(profile?.plan || 'trial');
      setTrades(tradeData || []);
      if (cached) {
        setCachedReport(cached as Report);
        setActiveReport(cached as Report);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function generateReport() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/coach', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate report');
      } else {
        setActiveReport(data);
        setCachedReport(data);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 md:p-10 flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-accent" size={24} />
      </div>
    );
  }

  const isPro = plan === 'pro' || plan === 'prop';

  // ── Pro/Prop view ──────────────────────────────────────────────────────

  if (isPro) {
    return (
      <div className="p-8 md:p-10 max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <p className="mono-label mb-2">AI Coach</p>
            <h1 className="text-3xl font-bold text-text tracking-tight">Your weekly trading analyst.</h1>
            <p className="text-text-muted text-sm mt-2 max-w-md">
              Generate a report based on your last 30 closed trades. Each report finds patterns, calls out leaks, and gives you one thing to fix.
            </p>
          </div>
          <button
            onClick={generateReport}
            disabled={generating}
            className="btn-primary shrink-0"
          >
            {generating ? (
              <><Loader2 className="animate-spin mr-2" size={15} /> Analysing trades…</>
            ) : (
              <><Brain size={15} className="mr-2" /> Generate Weekly Report</>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-signal-red/30 bg-signal-red/8">
            <p className="text-signal-red text-sm font-mono">{error}</p>
          </div>
        )}

        {activeReport ? (
          <ReportDisplay report={activeReport} />
        ) : (
          <div className="card rounded-xl p-16 text-center">
            <Brain className="text-accent mx-auto mb-4" size={36} strokeWidth={1.5} />
            <p className="font-bold text-xl text-text mb-2">No report yet.</p>
            <p className="text-text-muted max-w-sm mx-auto text-sm mb-6">
              Click "Generate Weekly Report" to analyse your last 30 closed trades. Takes about 10 seconds.
            </p>
            <button onClick={generateReport} disabled={generating} className="btn-primary">
              {generating ? <Loader2 className="animate-spin" size={15} /> : 'Generate my first report'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Core/Trial teaser view ─────────────────────────────────────────────

  const insights    = computeInsights(trades);
  const teaserLine  = computeTeaserLine(trades);

  return (
    <div className="p-8 md:p-10 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <p className="mono-label">AI Coach</p>
          <span className="font-mono text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/30">PRO</span>
        </div>
        <h1 className="text-3xl font-bold text-text tracking-tight">Your weekly trading analyst.</h1>
      </div>

      {/* Teaser: real insights */}
      <div className="card rounded-xl p-6 mb-5">
        <div className="flex items-center gap-2.5 mb-4">
          <Sparkles className="text-accent" size={16} />
          <h2 className="font-bold text-base text-text">Your Trading Snapshot</h2>
          <span className="font-mono text-[9px] text-text-dim uppercase tracking-widest ml-1">Live from your journal</span>
        </div>
        {trades.length === 0 ? (
          <p className="text-text-muted text-sm">
            Log some closed trades and we'll show you real insights here.
          </p>
        ) : (
          <ul className="space-y-3">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="text-accent shrink-0 mt-0.5" size={15} />
                <span className="text-text text-sm">{insight}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Blurred full report */}
      <div className="relative rounded-xl overflow-hidden">
        {/* Teaser line above blur */}
        {teaserLine && (
          <div className="card rounded-t-xl border-b-0 px-6 pt-5 pb-4 bg-bg-elevated">
            <p className="text-sm text-text-muted italic">
              <span className="text-accent font-semibold">Hint: </span>{teaserLine}
            </p>
          </div>
        )}

        {/* Blurred mock report */}
        <div className="blur-[4px] pointer-events-none select-none card rounded-none border-t-0" aria-hidden="true">
          <div className="border-b border-border p-6 bg-bg-elevated">
            <div className="flex items-center gap-2.5 mb-2">
              <Brain className="text-accent" size={16} />
              <span className="mono-label tracking-widest">Full AI Coach Report</span>
            </div>
            <p className="font-bold text-xl text-text">Week of May 4–10, 2026</p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <div className="mono-label mb-2">Executive Summary</div>
              <p className="text-text leading-relaxed font-medium">
                A profitable week overall, but one that hides a structural problem. Your breakout strategy is doing the heavy lifting, while a pattern you haven't noticed yet is bleeding those gains back slowly.
              </p>
            </div>
            <div className="divider" />
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg border border-signal-green/30 bg-signal-green/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="text-signal-green" size={17} />
              </div>
              <div>
                <span className="font-mono text-[10px] tracking-widest text-signal-green uppercase">Pattern 01 · Working</span>
                <h4 className="font-bold text-lg text-text mt-1 mb-2">Your breakout trades have a +2.1R expectancy.</h4>
                <p className="text-text-muted text-sm">Win rate 76% across your last 13 breakout trades. The setup is clean and the discipline is there. This is your edge — protect it.</p>
              </div>
            </div>
            <div className="divider" />
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg border border-signal-red/30 bg-signal-red/10 flex items-center justify-center shrink-0">
                <AlertCircle className="text-signal-red" size={17} />
              </div>
              <div>
                <span className="font-mono text-[10px] tracking-widest text-signal-red uppercase">Pattern 02 · Leaking</span>
                <h4 className="font-bold text-lg text-text mt-1 mb-2">There's a hidden pattern costing you money every week.</h4>
                <p className="text-text-muted text-sm">Across 9 trades in this category, you went 2-7 with a -1.4R average. This pattern has repeated for 3 consecutive weeks. Upgrade to see the full breakdown.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-bg via-bg/85 to-transparent px-6 py-10">
          <div className="text-center max-w-sm">
            <div className="w-12 h-12 rounded-full border border-accent/30 bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="text-accent" size={20} />
            </div>
            <h3 className="font-bold text-xl text-text mb-2">Full AI Coach Report</h3>
            <p className="text-text-muted text-sm mb-6">
              Get the complete analysis — working strategies, leaking patterns, and hidden behaviours found in your real trade data.
            </p>
            <Link
              href="/pricing"
              className="btn-primary inline-flex items-center gap-2"
            >
              Unlock AI Coach — Upgrade to Pro ($25/mo)
              <ArrowUpRight size={15} />
            </Link>
            <p className="mt-3 mono-label tracking-wider text-center">Includes all analytics · Cancel anytime</p>
          </div>
        </div>
      </div>
    </div>
  );
}
