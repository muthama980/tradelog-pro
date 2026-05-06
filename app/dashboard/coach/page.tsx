'use client';

import {
  Brain, Sparkles, CheckCircle2, AlertCircle, TrendingUp, TrendingDown,
  Clock, ListChecks,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Pattern {
  type: 'working' | 'leaking' | 'hidden';
  title: string;
  body: string;
  stats: { winRate: string; avgR: string; netPnl: string };
}

interface Report {
  week_start?: string;
  summary: string;
  patterns: Pattern[];
  mistakes?: string[];
  actionItems?: string[];
  closing: string;
}

// ── Demo report ───────────────────────────────────────────────────────────────

const DEMO_REPORT: Report = {
  week_start: '2026-05-04',
  summary:
    'A profitable week overall, but one that hides a structural problem. Your breakout strategy is doing the heavy lifting, while three patterns you haven\'t noticed yet are bleeding those gains back slowly. Net: +$250 — but your data says it should have been +$820.',
  patterns: [
    {
      type: 'working',
      title: 'Breakout entries have a +2.1R expectancy.',
      body: 'Win rate 76% across your last 13 breakout trades. The setup is clean and the discipline is there when you follow your rules. This is your edge — protect it and scale it.',
      stats: { winRate: '76%', avgR: '+2.1R', netPnl: '+$840' },
    },
    {
      type: 'leaking',
      title: 'You hold losing trades 3× longer than winners.',
      body: 'On 9 losing trades this week you held an average of 4.2h vs 1.4h on winners. Classic hope bias: the stop is hit mentally but not physically. Each hesitation cost you an extra -0.6R on average.',
      stats: { winRate: '22%', avgR: '-1.4R', netPnl: '-$380' },
    },
    {
      type: 'hidden',
      title: 'Monday opens consistently underperform for your style.',
      body: 'Three of your four worst weeks started with a Monday open loss. Gap fills and false breakouts hit your setup disproportionately early in the week. Skipping Monday opens entirely would have added +1.8R this month alone.',
      stats: { winRate: '31%', avgR: '-0.9R', netPnl: '-$210' },
    },
    {
      type: 'leaking',
      title: 'Post-loss trades have a 28% win rate.',
      body: 'After any trade with more than -1.5R loss, your next two trades win only 28% of the time versus your normal 64%. The emotional residue is measurable in your data. A mandatory 30-minute cooldown would recover an estimated +0.8R per week.',
      stats: { winRate: '28%', avgR: '-1.2R', netPnl: '-$290' },
    },
  ],
  mistakes: [
    'Moved stop loss on BTCUSDT long on Tuesday — turned a -0.8R into -2.1R',
    'Entered ETHUSDT without waiting for confirmation candle close (3 occurrences this week)',
    'Sized up on an emotionally-driven SOLUSDT trade after two consecutive losses — maximum position size breached',
  ],
  actionItems: [
    'No new entries for 30 minutes after any loss exceeding -1R',
    'Skip all entries in the first 30 minutes of Monday\'s New York open session',
    'Screenshot your stop placement before every trade — commit to it before you size in',
  ],
  closing:
    'You have a clear edge. The data proves it. The only thing between you and consistency is execution discipline on these three points.',
};

// ── Sub-components ────────────────────────────────────────────────────────────

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
            {isWorking ? '· What\'s Working' : isHidden ? '· Hidden Pattern' : '· What\'s Leaking'}
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

function ReportDisplay({ report }: { report: Report }) {
  return (
    <div className="card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="border-b border-border p-6 md:p-7 bg-bg-elevated">
        <div className="flex items-center gap-2.5 mb-2">
          <Brain className="text-accent" size={16} />
          <span className="mono-label tracking-widest">Weekly Coach Report</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-text-dim px-1.5 py-0.5 rounded border border-border bg-bg ml-1">
            Sample Preview
          </span>
        </div>
        {report.week_start && (
          <p className="font-mono text-xs text-text-dim">
            Week of{' '}
            {new Date(report.week_start).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </p>
        )}
      </div>

      <div className="p-6 md:p-7 space-y-7">
        {/* Executive Summary */}
        <div>
          <div className="mono-label mb-3">Executive Summary</div>
          <p className="text-lg text-text leading-relaxed font-medium">{report.summary}</p>
        </div>

        {/* Patterns: What's Working / Leaking / Hidden */}
        {report.patterns.map((p, i) => (
          <div key={i}>
            <div className="divider mb-7" />
            <PatternCard pattern={p} />
          </div>
        ))}

        {/* Mistake Analysis */}
        {report.mistakes && report.mistakes.length > 0 && (
          <>
            <div className="divider" />
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="text-signal-red" size={15} />
                <div className="mono-label">Mistake Analysis</div>
              </div>
              <ul className="space-y-3">
                {report.mistakes.map((m, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="font-mono text-[10px] text-signal-red shrink-0 mt-1">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-text-muted text-sm leading-relaxed">{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Action Items */}
        {report.actionItems && report.actionItems.length > 0 && (
          <>
            <div className="divider" />
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ListChecks className="text-accent" size={15} />
                <div className="mono-label">Action Items This Week</div>
              </div>
              <ul className="space-y-3">
                {report.actionItems.map((a, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="text-accent shrink-0 mt-0.5" size={15} />
                    <span className="text-text text-sm leading-relaxed">{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Closing */}
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CoachDashboardPage() {
  return (
    <div className="p-8 md:p-10 max-w-4xl">

      {/* Header */}
      <div className="mb-8">
        <p className="mono-label mb-2">AI Coach</p>
        <h1 className="text-3xl font-bold text-text tracking-tight">Your weekly trading analyst.</h1>
      </div>

      {/* Coming Soon banner */}
      <div className="rounded-xl border border-accent/40 bg-accent/5 p-5 mb-8 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg border border-accent/30 bg-accent/10 flex items-center justify-center shrink-0">
          <Clock className="text-accent" size={18} />
        </div>
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-accent font-bold mb-1">
            AI Coach — Coming Soon
          </div>
          <p className="text-text-muted text-sm leading-relaxed">
            Our AI Coach will analyze your trades weekly and surface patterns you can&apos;t see yourself.
            This feature is currently in development.
          </p>
        </div>
      </div>

      {/* Preview label */}
      <div className="flex items-center gap-3 mb-5">
        <Sparkles className="text-accent" size={14} />
        <p className="text-text-muted text-sm">
          Below is a preview of what your weekly AI Coach report will look like.
        </p>
      </div>

      {/* Full sample report — always visible, no gating */}
      <ReportDisplay report={DEMO_REPORT} />
    </div>
  );
}
