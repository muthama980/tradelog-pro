'use client';

import { useState, useRef, useMemo } from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend,
} from 'recharts';

type DateRange = '7d' | '30d' | '90d' | 'all' | 'custom';

const C = { CYAN: '#00D9FF', GREEN: '#22C55E', RED: '#EF4444' };

const RANGE_OPTIONS = [
  { v: '7d',    label: 'Last 7 Days' },
  { v: '30d',   label: 'Last 30 Days' },
  { v: '90d',   label: 'Last 90 Days' },
  { v: 'all',   label: 'All Time' },
  { v: 'custom', label: 'Custom Range' },
] as const;

function rangeLabel(range: DateRange, s: string, e: string) {
  if (range === '7d')    return 'Last 7 Days';
  if (range === '30d')   return 'Last 30 Days';
  if (range === '90d')   return 'Last 90 Days';
  if (range === 'all')   return 'All Time';
  if (s && e)            return `${s} to ${e}`;
  return 'Custom Range';
}

const PDF_TOOLTIP = {
  background: '#111113',
  border: '1px solid rgba(0,217,255,0.2)',
  borderRadius: 8,
  fontFamily: 'monospace',
  fontSize: 11,
  color: '#FAFAFA',
};

export default function DownloadReportButton({ trades }: { trades: any[] }) {
  const [showModal, setShowModal] = useState(false);
  const [range, setRange]         = useState<DateRange>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');
  const [generating, setGenerating]   = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  /* ── Filtered trades ─────────────────────────────── */
  const filtered = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date = now;

    if      (range === '7d')    start = new Date(now.getTime() - 7  * 86_400_000);
    else if (range === '30d')   start = new Date(now.getTime() - 30 * 86_400_000);
    else if (range === '90d')   start = new Date(now.getTime() - 90 * 86_400_000);
    else if (range === 'custom') {
      if (customStart) start = new Date(customStart);
      if (customEnd)   end   = new Date(customEnd + 'T23:59:59');
    }

    return trades.filter(t => {
      const d = new Date(t.opened_at);
      return (!start || d >= start) && d <= end;
    });
  }, [trades, range, customStart, customEnd]);

  /* ── Stats ───────────────────────────────────────── */
  const stats = useMemo(() => {
    const wins    = filtered.filter(t => Number(t.pnl) > 0);
    const totalPnl = filtered.reduce((s, t) => s + Number(t.pnl || 0), 0);
    const winRate  = filtered.length ? (wins.length / filtered.length) * 100 : 0;
    const avgR     = filtered.length
      ? filtered.reduce((s, t) => s + Number(t.r_multiple || 0), 0) / filtered.length
      : 0;
    const pnls = filtered.map(t => Number(t.pnl || 0));
    return {
      totalPnl,
      winRate,
      avgR,
      total: filtered.length,
      best:  pnls.length ? Math.max(...pnls) : 0,
      worst: pnls.length ? Math.min(...pnls) : 0,
    };
  }, [filtered]);

  /* ── Chart data ──────────────────────────────────── */
  const { equity, stratData, emoData, winLoss } = useMemo(() => {
    let cum = 0;
    const equity = filtered.map((t, i) => {
      cum += Number(t.pnl || 0);
      return { i: i + 1, pnl: Number(cum.toFixed(2)) };
    });

    const byStrat: Record<string, { pnl: number }> = {};
    filtered.forEach(t => {
      const s = t.strategy || 'untagged';
      byStrat[s] = byStrat[s] || { pnl: 0 };
      byStrat[s].pnl += Number(t.pnl || 0);
    });
    const stratData = Object.entries(byStrat).map(([strategy, d]) => ({
      strategy,
      pnl: Number(d.pnl.toFixed(2)),
    }));

    const byEmo: Record<string, number> = {};
    filtered.forEach(t => {
      const e = t.emotion || 'untagged';
      byEmo[e] = (byEmo[e] || 0) + Number(t.pnl || 0);
    });
    const emoData = Object.entries(byEmo).map(([emotion, pnl]) => ({
      emotion, pnl: Number(pnl.toFixed(2)),
    }));

    const wins = filtered.filter(t => Number(t.pnl) > 0).length;
    const winLoss = [
      { name: 'Wins',   value: wins,                  color: C.GREEN },
      { name: 'Losses', value: filtered.length - wins, color: C.RED },
    ];

    return { equity, stratData, emoData, winLoss };
  }, [filtered]);

  /* ── PDF generation ──────────────────────────────── */
  async function generate() {
    if (filtered.length === 0) {
      alert('No trades in the selected period.');
      return;
    }
    setGenerating(true);

    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const el = reportRef.current!;

      // Bring into viewport for capture
      el.style.position = 'fixed';
      el.style.left     = '0';
      el.style.top      = '0';
      el.style.opacity  = '1';
      el.style.zIndex   = '99999';
      el.style.pointerEvents = 'none';

      // Let charts paint
      await new Promise(r => setTimeout(r, 900));

      const canvas = await html2canvas(el, {
        scale:           1.5,
        useCORS:         true,
        allowTaint:      true,
        backgroundColor: '#0A0A0B',
        width:           900,
        height:          el.scrollHeight,
        windowWidth:     900,
      });

      // Hide again
      el.style.left    = '-9999px';
      el.style.opacity = '0';
      el.style.zIndex  = '-1';

      const A4_W = 210;
      const A4_H = 297;
      const imgData    = canvas.toDataURL('image/png');
      const contentH   = (canvas.height / canvas.width) * A4_W;

      let pdf: InstanceType<typeof jsPDF>;

      if (contentH <= A4_H) {
        // Content fits in one page — use exact height, no blank space
        pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [A4_W, contentH] });
        pdf.addImage(imgData, 'PNG', 0, 0, A4_W, contentH);
      } else {
        // Paginate: full A4 pages, last page trimmed to actual remaining content
        pdf = new jsPDF('p', 'mm', 'a4');
        let yOffset = 0;
        let page    = 0;

        while (yOffset < contentH) {
          const remaining = contentH - yOffset;
          const pageH     = Math.min(A4_H, remaining);

          if (page > 0) pdf.addPage([A4_W, pageH]);
          pdf.addImage(imgData, 'PNG', 0, -yOffset, A4_W, contentH);
          yOffset += pageH;
          page++;
        }
      }

      const slug = rangeLabel(range, customStart, customEnd)
        .toLowerCase().replace(/\s+/g, '-');
      pdf.save(`tradelog-report-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
      setShowModal(false);
    } catch (err) {
      console.error('PDF error:', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  /* ── Stat card helper ────────────────────────────── */
  const statCards = [
    { label: 'Total P&L',    val: `${stats.totalPnl >= 0 ? '+' : ''}$${stats.totalPnl.toFixed(2)}`, color: stats.totalPnl >= 0 ? C.GREEN : C.RED },
    { label: 'Win Rate',     val: `${stats.winRate.toFixed(1)}%`,   color: stats.winRate >= 50 ? C.GREEN : C.RED },
    { label: 'Avg R',        val: `${stats.avgR.toFixed(2)}R`,      color: stats.avgR >= 0 ? C.GREEN : C.RED },
    { label: 'Total Trades', val: `${stats.total}`,                 color: C.CYAN },
    { label: 'Best Trade',   val: `+$${stats.best.toFixed(2)}`,     color: C.GREEN },
    { label: 'Worst Trade',  val: `$${stats.worst.toFixed(2)}`,     color: C.RED },
  ];

  /* ── Render ──────────────────────────────────────── */
  return (
    <>
      <button onClick={() => setShowModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
        <Download size={14} />
        Download Report
      </button>

      {/* ── Date-range modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card rounded-xl w-full max-w-md p-7 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-text-dim hover:text-text transition"
            >
              <X size={18} />
            </button>
            <p className="mono-label mb-2">Report</p>
            <h2 className="font-bold text-xl text-text mb-6">Download PDF Report</h2>

            <div className="space-y-2 mb-6">
              {RANGE_OPTIONS.map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setRange(opt.v as DateRange)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                    range === opt.v
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-muted hover:border-border-strong hover:text-text'
                  }`}
                >
                  {opt.label}
                  {opt.v === range && filtered.length > 0 && (
                    <span className="float-right font-mono text-[11px] text-accent/70">
                      {filtered.length} trade{filtered.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {range === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div>
                  <label className="mono-label mb-1.5 block">From</label>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="form-input" />
                </div>
                <div>
                  <label className="mono-label mb-1.5 block">To</label>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="form-input" />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center text-sm">
                Cancel
              </button>
              <button
                onClick={generate}
                disabled={generating || filtered.length === 0}
                className="btn-primary flex-1 justify-center text-sm"
              >
                {generating
                  ? <><Loader2 className="animate-spin mr-2" size={14} /> Generating…</>
                  : <><Download size={14} className="mr-2" /> Download PDF</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hidden PDF report div (always in DOM, off-screen) ── */}
      <div
        ref={reportRef}
        style={{
          position:      'fixed',
          left:          '-9999px',
          top:           0,
          width:         900,
          background:    '#0A0A0B',
          color:         '#FAFAFA',
          fontFamily:    'system-ui, sans-serif',
          opacity:       0,
          zIndex:        -1,
          overflow:      'hidden',
          pointerEvents: 'none',
        }}
      >
        {/* Header */}
        <div style={{ padding: '40px 48px 28px', borderBottom: '1px solid #1F1F23' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, background: '#00D9FF', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 900, color: '#0A0A0B', letterSpacing: '-0.05em' }}>TLP</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 16 }}>
                TradeLog<span style={{ color: '#00D9FF' }}>Pro</span>
              </span>
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Generated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Trading Report</h1>
          <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#00D9FF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {rangeLabel(range, customStart, customEnd)}
          </p>
        </div>

        {/* Stats */}
        <div style={{ padding: '28px 48px', borderBottom: '1px solid #1F1F23' }}>
          <p style={{ fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#71717A', marginBottom: 16 }}>
            Performance Summary
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {statCards.map(s => (
              <div key={s.label} style={{ background: '#111113', border: '1px solid #1F1F23', borderRadius: 8, padding: '14px 18px' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#71717A', marginBottom: 6 }}>
                  {s.label}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: s.color, letterSpacing: '-0.02em' }}>
                  {s.val}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts */}
        {filtered.length > 0 && (
          <div style={{ padding: '28px 48px', borderBottom: '1px solid #1F1F23' }}>
            <p style={{ fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#71717A', marginBottom: 16 }}>
              Charts
            </p>

            {/* Equity curve */}
            <div style={{ background: '#111113', border: '1px solid #1F1F23', borderRadius: 8, padding: '18px 22px', marginBottom: 12 }}>
              <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#71717A', textTransform: 'uppercase', marginBottom: 10 }}>
                Equity Curve · Cumulative P&L
              </p>
              <AreaChart width={786} height={160} data={equity} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="pdf-eq" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={C.CYAN} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={C.CYAN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="i" stroke="#27272A" tickLine={false} fontSize={9} tick={{ fill: '#71717A' }} />
                <YAxis stroke="#27272A" tickLine={false} axisLine={false} fontSize={9} tick={{ fill: '#71717A' }} />
                <Tooltip contentStyle={PDF_TOOLTIP} />
                <Area type="monotone" dataKey="pnl" stroke={C.CYAN} strokeWidth={1.5} fill="url(#pdf-eq)" isAnimationActive={false} />
              </AreaChart>
            </div>

            {/* Strategy + Win/Loss */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ background: '#111113', border: '1px solid #1F1F23', borderRadius: 8, padding: '18px 22px' }}>
                <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#71717A', textTransform: 'uppercase', marginBottom: 10 }}>
                  P&L by Strategy
                </p>
                <BarChart width={365} height={150} data={stratData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <XAxis dataKey="strategy" stroke="#27272A" tickLine={false} fontSize={8} tick={{ fill: '#71717A' }} />
                  <YAxis stroke="#27272A" tickLine={false} axisLine={false} fontSize={8} tick={{ fill: '#71717A' }} />
                  <Tooltip contentStyle={PDF_TOOLTIP} />
                  <Bar dataKey="pnl" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {stratData.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? C.GREEN : C.RED} />)}
                  </Bar>
                </BarChart>
              </div>

              <div style={{ background: '#111113', border: '1px solid #1F1F23', borderRadius: 8, padding: '18px 22px' }}>
                <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#71717A', textTransform: 'uppercase', marginBottom: 10 }}>
                  Win / Loss Split
                </p>
                <PieChart width={365} height={150}>
                  <Pie data={winLoss} dataKey="value" cx={182} cy={70} innerRadius={40} outerRadius={62} paddingAngle={3} isAnimationActive={false}>
                    {winLoss.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace', color: '#A1A1AA' }} />
                  <Tooltip contentStyle={PDF_TOOLTIP} />
                </PieChart>
              </div>
            </div>

            {/* Emotion */}
            {emoData.length > 0 && (
              <div style={{ background: '#111113', border: '1px solid #1F1F23', borderRadius: 8, padding: '18px 22px' }}>
                <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#71717A', textTransform: 'uppercase', marginBottom: 10 }}>
                  P&L by Emotion
                </p>
                <BarChart width={786} height={120} data={emoData} layout="vertical" margin={{ top: 4, right: 8, left: 80, bottom: 4 }}>
                  <XAxis type="number" stroke="#27272A" tickLine={false} fontSize={8} tick={{ fill: '#71717A' }} />
                  <YAxis type="category" dataKey="emotion" stroke="#27272A" tickLine={false} axisLine={false} fontSize={8} tick={{ fill: '#71717A' }} />
                  <Tooltip contentStyle={PDF_TOOLTIP} />
                  <Bar dataKey="pnl" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                    {emoData.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? C.CYAN : C.RED} />)}
                  </Bar>
                </BarChart>
              </div>
            )}
          </div>
        )}

        {/* Trade table */}
        <div style={{ padding: '28px 48px 44px' }}>
          <p style={{ fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#71717A', marginBottom: 14 }}>
            Trade Log · {filtered.length} trades
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#111113', borderBottom: '1px solid #1F1F23' }}>
                {['Symbol', 'Date', 'Direction', 'Strategy', 'Emotion', 'P&L'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#71717A', fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #1F1F23', background: i % 2 === 0 ? '#111113' : 'transparent' }}>
                  <td style={{ padding: '8px 10px', color: '#FAFAFA', fontWeight: 600 }}>{t.symbol}</td>
                  <td style={{ padding: '8px 10px', color: '#71717A', fontSize: 10 }}>
                    {new Date(t.opened_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '8px 10px', color: '#A1A1AA', textTransform: 'capitalize' }}>{t.direction}</td>
                  <td style={{ padding: '8px 10px', color: '#71717A' }}>{t.strategy || '—'}</td>
                  <td style={{ padding: '8px 10px', color: '#71717A' }}>{t.emotion || '—'}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: Number(t.pnl) >= 0 ? C.GREEN : C.RED }}>
                    {t.pnl != null
                      ? `${Number(t.pnl) >= 0 ? '+' : ''}$${Number(t.pnl).toFixed(2)}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 28, paddingTop: 14, borderTop: '1px solid #1F1F23', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              TradeLog Pro · tradelog.pro
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#71717A' }}>
              Journal — not financial advice.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
