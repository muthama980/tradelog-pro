'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  equity: { i: number; pnl: number }[];
  axisStroke: string;
  tickColor: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipLbl: string;
}

export default function PlaybookEquityChart({
  equity, axisStroke, tickColor, tooltipBg, tooltipBorder, tooltipText, tooltipLbl,
}: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={equity} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00D9FF" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#00D9FF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="i"
          tick={{ fill: tickColor, fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}
          axisLine={{ stroke: axisStroke }} tickLine={false}
        />
        <YAxis
          tick={{ fill: tickColor, fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}
          axisLine={{ stroke: axisStroke }} tickLine={false}
          tickFormatter={v => `$${v}`} width={60}
        />
        <Tooltip
          contentStyle={{
            background: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: 8,
            fontFamily: 'var(--font-geist-mono)',
            fontSize: 12,
            color: tooltipText,
          }}
          labelStyle={{ color: tooltipLbl }}
          itemStyle={{ color: tooltipText }}
          formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Cumulative P&L']}
          labelFormatter={(l: any) => `Trade #${l}`}
        />
        <Area
          type="monotone" dataKey="pnl"
          stroke="#00D9FF" fill="url(#eqGrad)"
          strokeWidth={1.5} dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
