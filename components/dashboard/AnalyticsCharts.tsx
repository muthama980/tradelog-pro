'use client';

import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from '@/components/ThemeProvider';

const CHART_CYAN  = '#00D9FF';
const CHART_GREEN = '#22C55E';
const CHART_RED   = '#EF4444';

export default function AnalyticsCharts({ trades }: { trades: any[] }) {
  const { theme } = useTheme();

  const isLight = theme === 'light';
  const axisStroke  = isLight ? '#D4D4D8' : '#27272A';
  const tickColor   = isLight ? '#71717A' : '#71717A';
  const tooltipBg   = isLight ? '#FFFFFF' : '#111113';
  const tooltipBorder = isLight ? '#E4E4E7' : 'rgba(0, 217, 255, 0.2)';
  const tooltipText = isLight ? '#09090B' : '#FAFAFA';

  const tooltipStyle = {
    background: tooltipBg,
    border: `1px solid ${tooltipBorder}`,
    borderRadius: 8,
    fontFamily: 'var(--font-geist-mono)',
    fontSize: 12,
    color: tooltipText,
  };

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

  let cum = 0;
  const equity = trades.map((t, i) => {
    cum += Number(t.pnl || 0);
    return { i: i + 1, pnl: Number(cum.toFixed(2)) };
  });

  const byStrat: Record<string, { pnl: number; count: number; wins: number }> = {};
  trades.forEach((t: any) => {
    const s = t.strategy || 'untagged';
    byStrat[s] = byStrat[s] || { pnl: 0, count: 0, wins: 0 };
    byStrat[s].pnl += Number(t.pnl || 0);
    byStrat[s].count += 1;
    if (Number(t.pnl) > 0) byStrat[s].wins += 1;
  });
  const stratData = Object.entries(byStrat).map(([s, d]) => ({
    strategy: s,
    pnl: Number(d.pnl.toFixed(2)),
    winRate: Number((d.wins / d.count * 100).toFixed(1)),
  }));

  const byEmo: Record<string, number> = {};
  trades.forEach((t: any) => {
    const e = t.emotion || 'untagged';
    byEmo[e] = (byEmo[e] || 0) + Number(t.pnl || 0);
  });
  const emoData = Object.entries(byEmo).map(([emotion, pnl]) => ({ emotion, pnl: Number(pnl.toFixed(2)) }));

  const wins   = trades.filter((t: any) => Number(t.pnl) > 0).length;
  const losses = trades.length - wins;
  const winLossData = [
    { name: 'Wins',   value: wins,   color: CHART_GREEN },
    { name: 'Losses', value: losses, color: CHART_RED },
  ];

  return (
    <div className="space-y-5">
      {/* Equity curve */}
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
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: CHART_CYAN }} />
            <Area type="monotone" dataKey="pnl" stroke={CHART_CYAN} strokeWidth={2} fill="url(#g1)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* By strategy */}
        <div className="card rounded-xl p-6">
          <h3 className="font-bold text-base text-text mb-1">P&L by Strategy</h3>
          <p className="mono-label mb-5">Which playbook is paying you?</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stratData}>
              <XAxis dataKey="strategy" stroke={axisStroke} tickLine={false} fontSize={10} tick={{ fill: tickColor }} />
              <YAxis stroke={axisStroke} tickLine={false} axisLine={false} fontSize={11} tick={{ fill: tickColor }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {stratData.map((d, i) => (
                  <Cell key={i} fill={d.pnl >= 0 ? CHART_GREEN : CHART_RED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Win/Loss pie */}
        <div className="card rounded-xl p-6">
          <h3 className="font-bold text-base text-text mb-1">Win / Loss Split</h3>
          <p className="mono-label mb-5">Out of {trades.length} closed trades</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={winLossData} dataKey="value" innerRadius={70} outerRadius={110} paddingAngle={3}>
                {winLossData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'var(--font-geist-mono)', color: isLight ? '#52525B' : '#A1A1AA' }} />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* By emotion */}
      <div className="card rounded-xl p-6">
        <h3 className="font-bold text-base text-text mb-1">P&L by Emotion</h3>
        <p className="mono-label mb-5">When are you dangerous?</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={emoData} layout="vertical">
            <XAxis type="number" stroke={axisStroke} tickLine={false} fontSize={11} tick={{ fill: tickColor }} />
            <YAxis type="category" dataKey="emotion" stroke={axisStroke} tickLine={false} axisLine={false} fontSize={11} width={90} tick={{ fill: tickColor }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
              {emoData.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? CHART_CYAN : CHART_RED} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
