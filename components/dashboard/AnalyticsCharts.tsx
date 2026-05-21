'use client';

import { useState, useRef, useEffect } from 'react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceLine, Legend,
} from 'recharts';
import { Download, ChevronDown, X } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from '@/components/ThemeProvider';
import { exportTrades } from '@/lib/exportTrades';

const CYAN  = '#00D9FF';
const GREEN = '#22C55E';
const RED   = '#EF4444';

type TR = '1W' | '1M' | '3M' | '6M' | '1Y' | 'All';
const RANGES: TR[] = ['1W', '1M', '3M', '6M', '1Y', 'All'];

const RANGE_DAYS: Record<string, number> = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };

function filter(trades: any[], r: TR) {
  if (r === 'All') return trades;
  const cut = Date.now() - RANGE_DAYS[r] * 86_400_000;
  return trades.filter(t => new Date(t.opened_at).getTime() >= cut);
}

function dateLbl(iso: string, r: TR) {
  const d = new Date(iso);
  if (r === '1W') return format(d, 'EEE dd MMM');
  if (r === '1M' || r === '3M') return format(d, 'dd MMM');
  return format(d, 'MMM yy');
}

function breakdown(trades: any[], keyFn: (t: any) => string | null | undefined) {
  const m: Record<string, { pnl: number; count: number; wins: number }> = {};
  trades.forEach(t => {
    const k = keyFn(t) || 'untagged';
    m[k] = m[k] || { pnl: 0, count: 0, wins: 0 };
    m[k].pnl   += Number(t.pnl || 0);
    m[k].count += 1;
    if (Number(t.pnl) > 0) m[k].wins += 1;
  });
  return Object.entries(m)
    .map(([name, d]) => ({ name, pnl: Number(d.pnl.toFixed(2)), count: d.count, wins: d.wins }))
    .sort((a, b) => b.pnl - a.pnl);
}

const SESSION_LABEL: Record<string, string> = {
  asian: 'Asian', european: 'European', american: 'American',
  pacific: 'Pacific', 'asia-europe-overlap': 'Asia–EU', 'europe-america-overlap': 'EU–US',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SumCard({ label, value, color }: { label: string; value: string; color?: 'green' | 'red' }) {
  return (
    <div className="card rounded-xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim mb-1">{label}</p>
      <p className={`font-mono text-xl font-bold tabular ${color === 'green' ? 'text-signal-green' : color === 'red' ? 'text-signal-red' : 'text-text'}`}>
        {value}
      </p>
    </div>
  );
}

interface BdItem { name: string; pnl: number; count: number; wins: number; }
interface CT { axisStroke: string; tickColor: string; tooltipBg: string; tooltipBorder: string; tooltipText: string; tooltipLabel: string; }

function BreakdownSection({ title, sub, items, totalPnl, ct }: {
  title: string; sub: string; items: BdItem[]; totalPnl: number; ct: CT;
}) {
  const sorted = [...items].filter(d => d.count > 0).sort((a, b) => b.pnl - a.pnl);
  if (sorted.length === 0) return null;
  const chartH = Math.max(140, sorted.length * 38);
  const ts = { background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 8, fontFamily: 'var(--font-geist-mono)', fontSize: 12, color: ct.tooltipText };

  return (
    <div className="card rounded-xl p-6">
      <h3 className="font-bold text-base text-text mb-1">{title}</h3>
      <p className="mono-label mb-4">{sub}</p>

      <ResponsiveContainer width="100%" height={chartH}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <XAxis type="number" stroke={ct.axisStroke} tickLine={false} fontSize={10} tick={{ fill: ct.tickColor }} tickFormatter={v => `$${v}`} />
          <YAxis type="category" dataKey="name" stroke={ct.axisStroke} tickLine={false} axisLine={false} fontSize={10} width={84} tick={{ fill: ct.tickColor }} />
          <Tooltip contentStyle={ts} labelStyle={{ color: ct.tooltipLabel }} itemStyle={{ color: ct.tooltipText }} />
          <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
            {sorted.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? GREEN : RED} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[380px]">
          <thead>
            <tr className="font-mono text-[10px] tracking-widest text-text-dim uppercase border-b border-border">
              <th className="text-left pb-2 pr-3">Name</th>
              <th className="text-right pb-2 px-2">Trades</th>
              <th className="text-right pb-2 px-2">Win%</th>
              <th className="text-right pb-2 px-2">P&L</th>
              <th className="text-right pb-2 pl-2">% Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(d => {
              const wr  = d.count > 0 ? d.wins / d.count * 100 : 0;
              const pct = totalPnl !== 0 ? d.pnl / Math.abs(totalPnl) * 100 : 0;
              return (
                <tr key={d.name} className="border-b border-border/30">
                  <td className="py-2 pr-3 text-sm text-text capitalize">{d.name}</td>
                  <td className="py-2 px-2 text-right font-mono text-sm text-text-muted">{d.count}</td>
                  <td className={`py-2 px-2 text-right font-mono text-sm font-bold ${wr >= 50 ? 'text-signal-green' : 'text-signal-red'}`}>
                    {wr.toFixed(0)}%
                  </td>
                  <td className={`py-2 px-2 text-right font-mono text-sm tabular font-bold ${d.pnl >= 0 ? 'text-signal-green' : 'text-signal-red'}`}>
                    {d.pnl >= 0 ? '+' : ''}${d.pnl.toFixed(2)}
                  </td>
                  <td className={`py-2 pl-2 text-right font-mono text-sm ${pct >= 0 ? 'text-text-muted' : 'text-signal-red'}`}>
                    {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AnalyticsCharts({ trades: allTrades }: { trades: any[] }) {
  const { theme } = useTheme();

  const [timeRange,   setTimeRange]   = useState<TR>('1M');
  const [showExport,  setShowExport]  = useState(false);
  const [exportMode,  setExportMode]  = useState<'range' | null>(null);
  const [rangeStart,  setRangeStart]  = useState('');
  const [rangeEnd,    setRangeEnd]    = useState('');
  const exportRef = useRef<HTMLDivElement>(null);

  const isLight = theme === 'light';
  const axisStroke   = isLight ? '#D4D4D8' : '#27272A';
  const tickColor    = isLight ? '#52525B' : '#71717A';
  const tooltipBg    = isLight ? '#FFFFFF' : '#0A0A0B';
  const tooltipBorder = isLight ? '#E4E4E7' : '#00D9FF';
  const tooltipText  = isLight ? '#09090B' : '#FAFAFA';
  const tooltipLabel = isLight ? '#52525B' : '#00D9FF';

  const ct: CT = { axisStroke, tickColor, tooltipBg, tooltipBorder, tooltipText, tooltipLabel };
  const ts = { background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontFamily: 'var(--font-geist-mono)', fontSize: 12, color: tooltipText };

  useEffect(() => {
    if (!showExport) return;
    function h(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false); setExportMode(null);
      }
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showExport]);

  const ft = filter(allTrades, timeRange);

  function doExport(mode: 'all' | 'range' | 'view') {
    let data: any[];
    if (mode === 'all')  data = allTrades;
    else if (mode === 'view') data = ft;
    else {
      const s = rangeStart ? new Date(rangeStart).getTime() : 0;
      const e = rangeEnd   ? new Date(rangeEnd).getTime() + 86_400_000 : Infinity;
      data = allTrades.filter(t => { const ts = new Date(t.opened_at).getTime(); return ts >= s && ts <= e; });
    }
    exportTrades(data, `tradelog-pro-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setShowExport(false); setExportMode(null);
  }

  if (!allTrades.length) {
    return (
      <div className="card rounded-xl p-16 text-center">
        <p className="font-bold text-xl text-text mb-2">Not enough data yet.</p>
        <p className="text-text-muted max-w-md mx-auto text-sm">Log at least 5 closed trades to unlock your analytics.</p>
      </div>
    );
  }

  // ── Equity curve ──────────────────────────────────────────────────────────
  let cum = 0;
  const eqData = ft.map((t, i) => {
    cum += Number(t.pnl || 0);
    return {
      i: i + 1,
      dateLabel: dateLbl(t.opened_at, timeRange),
      rawDate: new Date(t.opened_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
      symbol:   t.symbol,
      tradePnl: Number(t.pnl || 0),
      cumPnl:   Number(cum.toFixed(2)),
      strategy: t.strategy || '—',
      emotion:  t.emotion  || '—',
    };
  });

  const cums  = eqData.map(e => e.cumPnl);
  const yMaxR = Math.max(...cums, 0);
  const yMinR = Math.min(...cums, 0);
  const pad   = Math.max(Math.abs(yMaxR - yMinR) * 0.08, 5);
  const yMax  = yMaxR + pad;
  const yMin  = yMinR - pad;
  const yrng  = yMax - yMin;
  const zero  = yrng > 0 ? (yMax / yrng) * 100 : 50;

  // ── Summary ───────────────────────────────────────────────────────────────
  const wins    = ft.filter(t => Number(t.pnl) > 0);
  const losses  = ft.filter(t => Number(t.pnl) <= 0);
  const netPnl  = ft.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const winSum  = wins.reduce((s, t) => s + Number(t.pnl), 0);
  const lossAbs = Math.abs(losses.reduce((s, t) => s + Number(t.pnl), 0));
  const winRate = ft.length ? (wins.length / ft.length * 100) : 0;
  const pf      = lossAbs > 0 ? winSum / lossAbs : (wins.length > 0 ? Infinity : 0);

  // ── Breakdowns ────────────────────────────────────────────────────────────
  const stratData   = breakdown(ft, t => t.strategy).filter(d => d.name !== 'untagged');
  const emoData     = breakdown(ft, t => t.emotion).filter(d => d.name !== 'untagged');
  const sessionData = breakdown(ft.filter(t => t.trading_session), t => SESSION_LABEL[t.trading_session] ?? t.trading_session);
  const brokerData  = breakdown(ft.filter(t => t.broker), t => t.broker);

  const DOW = [1, 2, 3, 4, 5, 6, 0];
  const DOW_LBL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const byDow: Record<number, { pnl: number; count: number; wins: number }> = {};
  ft.forEach(t => {
    const d = new Date(t.opened_at).getDay();
    byDow[d] = byDow[d] || { pnl: 0, count: 0, wins: 0 };
    byDow[d].pnl += Number(t.pnl || 0);
    byDow[d].count += 1;
    if (Number(t.pnl) > 0) byDow[d].wins += 1;
  });
  const dowData: BdItem[] = DOW.map((d, i) => ({
    name: DOW_LBL[i],
    pnl:   Number((byDow[d]?.pnl ?? 0).toFixed(2)),
    count: byDow[d]?.count ?? 0,
    wins:  byDow[d]?.wins  ?? 0,
  }));

  // Mistake
  const byMistake: Record<string, { pnl: number; count: number }> = {};
  let cleanPnl = 0, cleanCount = 0;
  ft.forEach(t => {
    const ms = Array.isArray(t.mistakes) ? t.mistakes : [];
    const p  = Number(t.pnl || 0);
    if (!ms.length && p > 0) { cleanPnl += p; cleanCount++; }
    ms.forEach((m: string) => {
      byMistake[m] = byMistake[m] || { pnl: 0, count: 0 };
      byMistake[m].pnl   += p;
      byMistake[m].count += 1;
    });
  });
  const mistakeData = Object.entries(byMistake)
    .map(([mistake, d]) => ({ mistake, pnl: Number(d.pnl.toFixed(2)), count: d.count }))
    .filter(d => d.pnl < 0).sort((a, b) => a.pnl - b.pnl);

  // Win/loss pie
  const winLoss = [
    { name: 'Wins',   value: wins.length,   color: GREEN },
    { name: 'Losses', value: losses.length, color: RED },
  ];

  // Custom equity tooltip
  function EqTip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-geist-mono)', fontSize: 12, minWidth: 170 }}>
        <p style={{ color: tooltipLabel, marginBottom: 6, fontWeight: 700 }}>{d.rawDate} · {d.symbol}</p>
        <p style={{ color: d.tradePnl >= 0 ? GREEN : RED, marginBottom: 2 }}>
          Trade: {d.tradePnl >= 0 ? '+' : ''}${d.tradePnl.toFixed(2)}
        </p>
        <p style={{ color: d.cumPnl >= 0 ? GREEN : RED, marginBottom: 4 }}>
          Total: {d.cumPnl >= 0 ? '+' : ''}${d.cumPnl.toFixed(2)}
        </p>
        {d.strategy !== '—' && <p style={{ color: tickColor }}>Strategy: {d.strategy}</p>}
        {d.emotion  !== '—' && <p style={{ color: tickColor }}>Emotion: {d.emotion}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Controls ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 overflow-x-auto bg-bg-elevated border border-border rounded-lg p-1 flex-1 min-w-0">
          {RANGES.map(r => (
            <button
              key={r} onClick={() => setTimeRange(r)}
              className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                timeRange === r ? 'bg-accent text-bg font-black' : 'text-text-dim hover:text-text'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="relative shrink-0" ref={exportRef}>
          <button
            onClick={() => { setShowExport(v => !v); setExportMode(null); }}
            className="btn-secondary flex items-center gap-2 py-2 px-3 text-sm"
          >
            <Download size={13} /> Export
            <ChevronDown size={11} className={`transition-transform ${showExport ? 'rotate-180' : ''}`} />
          </button>
          {showExport && (
            <div className="absolute right-0 top-11 z-40 w-64 bg-bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
              {!exportMode ? (
                <>
                  <button onClick={() => doExport('view')} className="w-full text-left px-4 py-3 hover:bg-bg-elevated transition-colors">
                    <p className="text-sm font-medium text-text">Export Current View</p>
                    <p className="text-xs text-text-dim mt-0.5">Trades in selected time range</p>
                  </button>
                  <div className="h-px bg-border" />
                  <button onClick={() => setExportMode('range')} className="w-full text-left px-4 py-3 hover:bg-bg-elevated transition-colors">
                    <p className="text-sm font-medium text-text">Export Date Range</p>
                    <p className="text-xs text-text-dim mt-0.5">Choose a custom from / to date</p>
                  </button>
                  <div className="h-px bg-border" />
                  <button onClick={() => doExport('all')} className="w-full text-left px-4 py-3 hover:bg-bg-elevated transition-colors">
                    <p className="text-sm font-medium text-text">Export All Trades</p>
                    <p className="text-xs text-text-dim mt-0.5">All {allTrades.length} closed trades</p>
                  </button>
                </>
              ) : (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="mono-label">Date Range</p>
                    <button onClick={() => setExportMode(null)} className="text-text-dim hover:text-text"><X size={13} /></button>
                  </div>
                  <div>
                    <label className="mono-label mb-1 block">From</label>
                    <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} className="form-input text-sm" />
                  </div>
                  <div>
                    <label className="mono-label mb-1 block">To</label>
                    <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} className="form-input text-sm" />
                  </div>
                  <button onClick={() => doExport('range')} className="btn-primary w-full justify-center text-sm py-2">
                    <Download size={13} className="mr-2" /> Export
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SumCard label="Total Trades"  value={String(ft.length)} />
        <SumCard label="Win Rate"      value={`${winRate.toFixed(1)}%`}  color={winRate >= 50 ? 'green' : 'red'} />
        <SumCard label="Net P&L"       value={`${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)}`} color={netPnl >= 0 ? 'green' : 'red'} />
        <SumCard label="Profit Factor" value={pf === Infinity ? '∞' : pf.toFixed(2)} color={pf > 1 ? 'green' : 'red'} />
      </div>

      {/* ── Equity curve ── */}
      <div className="card rounded-xl p-6">
        <h3 className="font-bold text-base text-text mb-1">Equity Curve</h3>
        <p className="mono-label mb-5">Cumulative P&L — {ft.length} closed trades</p>
        {ft.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center">
            <p className="text-text-dim text-sm">No trades in this period</p>
          </div>
        ) : (
          <div className="h-[250px] md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={eqData} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="eqStroke" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={`${zero}%`} stopColor={GREEN} stopOpacity={1} />
                    <stop offset={`${zero}%`} stopColor={RED}   stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={`${Math.max(0, zero - 5)}%`}   stopColor={GREEN} stopOpacity={0.18} />
                    <stop offset={`${zero}%`}                     stopColor={GREEN} stopOpacity={0.02} />
                    <stop offset={`${zero}%`}                     stopColor={RED}   stopOpacity={0.02} />
                    <stop offset={`${Math.min(100, zero + 5)}%`}  stopColor={RED}   stopOpacity={0.18} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={axisStroke} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: tickColor, fontSize: 10, fontFamily: 'var(--font-geist-mono)' }}
                  axisLine={{ stroke: axisStroke }} tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[yMin, yMax]}
                  tick={{ fill: tickColor, fontSize: 10, fontFamily: 'var(--font-geist-mono)' }}
                  axisLine={{ stroke: axisStroke }} tickLine={false}
                  tickFormatter={v => `$${v}`} width={68}
                />
                <ReferenceLine y={0} stroke={axisStroke} strokeDasharray="4 4" />
                <Tooltip content={<EqTip />} />
                <Area
                  type="monotone" dataKey="cumPnl"
                  stroke="url(#eqStroke)" strokeWidth={2}
                  fill="url(#eqFill)"
                  dot={{ r: 3, fill: CYAN, stroke: '#0A0A0B', strokeWidth: 1 }}
                  activeDot={{ r: 5, fill: CYAN, stroke: '#0A0A0B', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Win/Loss + Strategy ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card rounded-xl p-6">
          <h3 className="font-bold text-base text-text mb-1">Win / Loss Split</h3>
          <p className="mono-label mb-5">Out of {ft.length} closed trades</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={winLoss} dataKey="value" innerRadius={70} outerRadius={110} paddingAngle={3}>
                {winLoss.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'var(--font-geist-mono)', color: tooltipText }} />
              <Tooltip contentStyle={ts} labelStyle={{ color: tooltipLabel }} itemStyle={{ color: tooltipText }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {stratData.length > 0 && (
          <BreakdownSection title="P&L by Strategy" sub="Which playbook is paying you?" items={stratData} totalPnl={netPnl} ct={ct} />
        )}
      </div>

      {/* ── Emotion ── */}
      {emoData.length > 0 && (
        <BreakdownSection title="P&L by Emotion" sub="When are you dangerous?" items={emoData} totalPnl={netPnl} ct={ct} />
      )}

      {/* ── Day of week ── */}
      <BreakdownSection title="P&L by Day of Week" sub="Which days make you money?" items={dowData} totalPnl={netPnl} ct={ct} />

      {/* ── Broker ── */}
      {brokerData.length > 0 && (
        <BreakdownSection title="P&L by Broker" sub="Which platform performs best?" items={brokerData} totalPnl={netPnl} ct={ct} />
      )}

      {/* ── Session ── */}
      {sessionData.length > 0 && (
        <BreakdownSection title="P&L by Trading Session" sub="Which session is your edge strongest in?" items={sessionData} totalPnl={netPnl} ct={ct} />
      )}

      {/* ── Mistake analysis ── */}
      <div className="card rounded-xl p-6">
        <h3 className="font-bold text-base text-text mb-1">Mistake Cost Analysis</h3>
        <p className="mono-label mb-5">What's your most expensive habit?</p>
        {cleanCount === 0 && mistakeData.length === 0 ? (
          <p className="text-text-muted text-sm py-6 text-center">No mistake data yet. Tag mistakes on your trades to see the cost breakdown.</p>
        ) : (
          <div className="space-y-2">
            {cleanCount > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-signal-green/8 border border-signal-green/20">
                <div>
                  <span className="font-mono text-xs text-signal-green uppercase tracking-wider">Clean trades</span>
                  <span className="text-text-dim text-xs ml-2">({cleanCount} trades, no mistakes)</span>
                </div>
                <span className="font-mono text-sm font-bold text-signal-green tabular">+${cleanPnl.toFixed(2)}</span>
              </div>
            )}
            {mistakeData.map(d => (
              <div key={d.mistake} className="flex items-center justify-between p-3 rounded-lg bg-signal-red/8 border border-signal-red/20">
                <div>
                  <span className="font-mono text-xs text-signal-red uppercase tracking-wider">{d.mistake}</span>
                  <span className="text-text-dim text-xs ml-2">({d.count} {d.count === 1 ? 'trade' : 'trades'})</span>
                </div>
                <span className="font-mono text-sm font-bold text-signal-red tabular">${d.pnl.toFixed(2)}</span>
              </div>
            ))}
            {mistakeData.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <ResponsiveContainer width="100%" height={Math.max(150, mistakeData.length * 40)}>
                  <BarChart data={mistakeData} layout="vertical">
                    <XAxis type="number" stroke={axisStroke} tickLine={false} fontSize={11} tick={{ fill: tickColor }} />
                    <YAxis type="category" dataKey="mistake" stroke={axisStroke} tickLine={false} axisLine={false} fontSize={10} width={120} tick={{ fill: tickColor }} />
                    <Tooltip contentStyle={ts} labelStyle={{ color: tooltipLabel }} itemStyle={{ color: tooltipText }} />
                    <Bar dataKey="pnl" radius={[0, 4, 4, 0]} fill={RED} />
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
