'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '@/components/ThemeProvider';

const CHART_CYAN = '#00D9FF';

export default function OverviewChart({ trades }: { trades: any[] }) {
  const { theme } = useTheme();

  const isLight = theme === 'light';
  const axisStroke = isLight ? '#D4D4D8' : '#27272A';
  const tickColor  = isLight ? '#52525B' : '#71717A';
  const tooltipText = isLight ? '#09090B' : '#FAFAFA';
  const tooltipStyle = {
    background: isLight ? '#FFFFFF' : '#0A0A0B',
    border: `1px solid ${isLight ? '#E4E4E7' : '#00D9FF'}`,
    borderRadius: 8,
    fontFamily: 'var(--font-geist-mono)',
    fontSize: 12,
    color: tooltipText,
  };

  if (!trades || trades.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted text-sm border border-dashed border-border rounded-lg">
        Your equity curve appears here once you've logged a few trades.
      </div>
    );
  }

  const sorted = [...trades].sort(
    (a, b) => new Date(a.closed_at || a.opened_at).getTime() - new Date(b.closed_at || b.opened_at).getTime()
  );

  let cum = 0;
  const data = sorted.map((t) => {
    cum += Number(t.pnl || 0);
    return {
      date: new Date(t.closed_at || t.opened_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pnl: Number(cum.toFixed(2)),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_CYAN} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_CYAN} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" stroke={axisStroke} tickLine={false} fontSize={11} tick={{ fill: tickColor }} />
        <YAxis stroke={axisStroke} tickLine={false} axisLine={false} fontSize={11} tick={{ fill: tickColor }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: isLight ? '#52525B' : CHART_CYAN }} itemStyle={{ color: tooltipText }} />
        <Area type="monotone" dataKey="pnl" stroke={CHART_CYAN} strokeWidth={2} fill="url(#cyanGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
