'use client';

import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useTheme } from '@/components/ThemeProvider';

const CHART_CYAN  = '#00D9FF';
const CHART_GREEN = '#22C55E';
const CHART_RED   = '#EF4444';

export default function AnalyticsCharts({ trades }: { trades: any[] }) {
  const { theme } = useTheme();

  const isLight       = theme === 'light';
  const axisStroke    = isLight ? '#D4D4D8' : '#27272A';
  const tickColor     = isLight ? '#52525B' : '#71717A';
  const tooltipBg     = isLight ? '#FFFFFF' : '#0A0A0B';
  const tooltipBorder = isLight ? '#E4E4E7' : '#00D9FF';
  const tooltipText   = isLight ? '#09090B' : '#FAFAFA';
  const tooltipLabel  = isLight ? '#52525B' : '#00D9FF';

  const tooltipStyle = {
    background: tooltipBg,
    border: `1px solid ${tooltipBorder}`,
    borderRadius: 8,
    fontFamily: 'var(--font-geist-mono)',
    fontSize: 12,
    color: tooltipText,
  };
  const labelStyle = { color: tooltipLabel };
  const itemStyle  = { color: tooltipText };

  if (!trades || trades.length === 0) {
    return (
      <div className="card rounded-xl p-16 text-center">
        <p className="font-bold text-xl text-text mb-2">Not enough data yet.</p>
        <p className="text-text-muted max-w-md mx-auto text-sm">
          Log at least 5 closed trades to unlock your analytics. The patterns are waiting.
        </p>
      </div>
    );
  }

  // ── Equity curve ─────────────────────────────────────────────────────────
  let cum = 0;
  const equity = trades.map((t, i) => {
    cum += Number(t.pnl || 0);
    return { i: i + 1, pnl: Number(cum.toFixed(2)) };
  });

  // ── P&L by strategy ──────────────────────────────────────────────────────
  const byStrat: Record<string, { pnl: number; count: number; wins: number }> = {};
  trades.forEach((t: any) => {
    const s = t.strategy || 'untagged';
    byStrat[s] = byStrat[s] || { pnl: 0, count: 0, wins: 0 };
    byStrat[s].pnl   += Number(t.pnl || 0);
    byStrat[s].count += 1;
    if (Number(t.pnl) > 0) byStrat[s].wins += 1;
  });
  const stratData = Object.entries(byStrat).map(([s, d]) => ({
    strategy: s,
    pnl:     Number(d.pnl.toFixed(2)),
    winRate: Number((d.wins / d.count * 100).toFixed(1)),
  }));

  // ── Win / loss ────────────────────────────────────────────────────────────
  const wins   = trades.filter((t: any) => Number(t.pnl) > 0).length;
  const losses = trades.length - wins;
  const winLossData = [
    { name: 'Wins',   value: wins,   color: CHART_GREEN },
    { name: 'Losses', value: losses, color: CHART_RED },
  ];

  // ── P&L by emotion ────────────────────────────────────────────────────────
  const byEmo: Record<string, number> = {};
  trades.forEach((t: any) => {
    const e = t.emotion || 'untagged';
    byEmo[e] = (byEmo[e] || 0) + Number(t.pnl || 0);
  });
  const emoData = Object.entries(byEmo).map(([emotion, pnl]) => ({ emotion, pnl: Number(pnl.toFixed(2)) }));

  // ── P&L by trading session ───────────────────────────────────────────────
  const bySession: Record<string, { pnl: number; count: number; wins: number }> = {};
  trades.forEach((t: any) => {
    if (!t.trading_session) return;
    const s = t.trading_session;
    bySession[s] = bySession[s] || { pnl: 0, count: 0, wins: 0 };
    bySession[s].pnl   += Number(t.pnl || 0);
    bySession[s].count += 1;
    if (Number(t.pnl) > 0) bySession[s].wins += 1;
  });
  const SESSION_LABELS: Record<string, string> = {
    'asian':                  'Asian',
    'european':               'European',
    'american':               'American',
    'pacific':                'Pacific',
    'asia-europe-overlap':    'Asia–EU',
    'europe-america-overlap': 'EU–US',
  };
  const sessionData = Object.entries(bySession).map(([session, d]) => ({
    session: SESSION_LABELS[session] ?? session,
    pnl:     Number(d.pnl.toFixed(2)),
    winRate: Number((d.wins / d.count * 100).toFixed(1)),
  }));
  const hasSessionData = sessionData.length > 0;

  // ── Mistake summary ───────────────────────────────────────────────────────
  const byMistake: Record<string, { pnl: number; count: number }> = {};
  let cleanPnl = 0, cleanCount = 0;

  trades.forEach((t: any) => {
    const mistakes = Array.isArray(t.mistakes) ? t.mistakes : [];
    const pnl = Number(t.pnl || 0);
    if (mistakes.length === 0 && pnl > 0) {
      cleanPnl += pnl;
      cleanCount++;
    }
    mistakes.forEach((m: string) => {
      byMistake[m] = byMistake[m] || { pnl: 0, count: 0 };
      byMistake[m].pnl   += pnl;
      byMistake[m].count += 1;
    });
  });

  const mistakeData = Object.entries(byMistake)
    .map(([mistake, d]) => ({ mistake, pnl: Number(d.pnl.toFixed(2)), count: d.count }))
    .filter(d => d.pnl < 0)
    .sort((a, b) => a.pnl - b.pnl);

  const hasMistakeData = mistakeData.length > 0 || cleanCount > 0;

  return (
    <div className="space-y-5">

      {/* ── Equity curve ──────────────────────────────────────────────── */}
      <div className="card rounded-xl p-6">
        <h3 className="font-bold text-base text-text mb-1">Equity Curve</h3>
        <p className="mono-label mb-5">Cumulative P&L across all closed trades</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={equity}>
            <defs>
              <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={CHART_CYAN} stopOpacity={0.4} />
                <stop offset="100%" stopColor={CHART_CYAN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="i" stroke={axisStroke} tickLine={false} fontSize={11} tick={{ fill: tickColor }} />
            <YAxis stroke={axisStroke} tickLine={false} axisLine={false} fontSize={11} tick={{ fill: tickColor }} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} />
            <Area type="monotone" dataKey="pnl" stroke={CHART_CYAN} strokeWidth={2} fill="url(#g1)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Strategy + Win/Loss ───────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card rounded-xl p-6">
          <h3 className="font-bold text-base text-text mb-1">P&L by Strategy</h3>
          <p className="mono-label mb-5">Which playbook is paying you?</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stratData}>
              <XAxis dataKey="strategy" stroke={axisStroke} tickLine={false} fontSize={10} tick={{ fill: tickColor }} />
              <YAxis stroke={axisStroke} tickLine={false} axisLine={false} fontSize={11} tick={{ fill: tickColor }} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {stratData.map((d, i) => (
                  <Cell key={i} fill={d.pnl >= 0 ? CHART_GREEN : CHART_RED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card rounded-xl p-6">
          <h3 className="font-bold text-base text-text mb-1">Win / Loss Split</h3>
          <p className="mono-label mb-5">Out of {trades.length} closed trades</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={winLossData} dataKey="value" innerRadius={70} outerRadius={110} paddingAngle={3}>
                {winLossData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'var(--font-geist-mono)', color: isLight ? '#52525B' : '#FAFAFA' }} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── P&L by emotion ───────────────────────────────────────────── */}
      <div className="card rounded-xl p-6">
        <h3 className="font-bold text-base text-text mb-1">P&L by Emotion</h3>
        <p className="mono-label mb-5">When are you dangerous?</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={emoData} layout="vertical">
            <XAxis type="number" stroke={axisStroke} tickLine={false} fontSize={11} tick={{ fill: tickColor }} />
            <YAxis type="category" dataKey="emotion" stroke={axisStroke} tickLine={false} axisLine={false} fontSize={11} width={90} tick={{ fill: tickColor }} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} />
            <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
              {emoData.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? CHART_CYAN : CHART_RED} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── P&L by trading session ───────────────────────────────────── */}
      {hasSessionData && (
        <div className="card rounded-xl p-6">
          <h3 className="font-bold text-base text-text mb-1">P&L by Trading Session</h3>
          <p className="mono-label mb-5">Which session is your edge strongest in?</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sessionData}>
              <XAxis dataKey="session" stroke={axisStroke} tickLine={false} fontSize={11} tick={{ fill: tickColor }} />
              <YAxis stroke={axisStroke} tickLine={false} axisLine={false} fontSize={11} tick={{ fill: tickColor }} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {sessionData.map((d, i) => (
                  <Cell key={i} fill={d.pnl >= 0 ? CHART_GREEN : CHART_RED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Mistake tracking summary ─────────────────────────────────── */}
      <div className="card rounded-xl p-6">
        <h3 className="font-bold text-base text-text mb-1">Mistake Cost Analysis</h3>
        <p className="mono-label mb-5">What's your most expensive habit?</p>

        {!hasMistakeData ? (
          <p className="text-text-muted text-sm py-6 text-center">
            No mistake data yet. Tag mistakes on your trades to see the cost breakdown.
          </p>
        ) : (
          <div className="space-y-3">
            {cleanCount > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-signal-green/8 border border-signal-green/20">
                <div>
                  <span className="font-mono text-xs text-signal-green uppercase tracking-wider">Clean trades</span>
                  <span className="text-text-dim text-xs ml-2">({cleanCount} trades, no mistakes)</span>
                </div>
                <span className="font-mono text-sm font-bold text-signal-green tabular">
                  +${cleanPnl.toFixed(2)}
                </span>
              </div>
            )}

            {mistakeData.map((d) => (
              <div key={d.mistake} className="flex items-center justify-between p-3 rounded-lg bg-signal-red/8 border border-signal-red/20">
                <div>
                  <span className="font-mono text-xs text-signal-red uppercase tracking-wider">{d.mistake}</span>
                  <span className="text-text-dim text-xs ml-2">({d.count} {d.count === 1 ? 'trade' : 'trades'})</span>
                </div>
                <span className="font-mono text-sm font-bold text-signal-red tabular">
                  ${d.pnl.toFixed(2)}
                </span>
              </div>
            ))}

            {mistakeData.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={mistakeData} layout="vertical">
                    <XAxis type="number" stroke={axisStroke} tickLine={false} fontSize={11} tick={{ fill: tickColor }} />
                    <YAxis type="category" dataKey="mistake" stroke={axisStroke} tickLine={false} axisLine={false} fontSize={10} width={120} tick={{ fill: tickColor }} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} />
                    <Bar dataKey="pnl" radius={[0, 4, 4, 0]} fill={CHART_RED} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
