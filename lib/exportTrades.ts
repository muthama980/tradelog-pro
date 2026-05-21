import * as XLSX from 'xlsx';

function fmtDuration(ms: number): string {
  if (!ms || ms <= 0) return '';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function buildBreakdown(trades: any[], key: string) {
  const map: Record<string, { pnl: number; count: number; wins: number }> = {};
  trades.forEach(t => {
    const k = (t[key] as string) || 'Untagged';
    map[k] = map[k] || { pnl: 0, count: 0, wins: 0 };
    map[k].pnl   += Number(t.pnl || 0);
    map[k].count += 1;
    if (Number(t.pnl) > 0) map[k].wins += 1;
  });
  return Object.entries(map)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.pnl - a.pnl);
}

export function exportTrades(trades: any[], filename: string) {
  const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);

  // ── Sheet 1: Trades ───────────────────────────────────────────────────────
  const tradeRows = trades.map(t => {
    const entryVal = Number(t.entry_price || 0) * Number(t.position_size || 0);
    const pnlNum   = Number(t.pnl || 0);
    const pnlPct   = entryVal > 0 ? ((pnlNum / entryVal) * 100).toFixed(2) + '%' : '';
    const ms       = t.opened_at && t.closed_at
      ? new Date(t.closed_at).getTime() - new Date(t.opened_at).getTime() : 0;
    return {
      'Date':           t.opened_at ? new Date(t.opened_at).toLocaleDateString('en-GB') : '',
      'Symbol/Pair':    t.symbol    ?? '',
      'Direction':      t.direction ? t.direction.charAt(0).toUpperCase() + t.direction.slice(1) : '',
      'Entry Price':    t.entry_price != null ? Number(t.entry_price) : '',
      'Exit Price':     t.exit_price  != null ? Number(t.exit_price)  : '',
      'Position Size':  t.position_size != null ? Number(t.position_size) : '',
      'P&L ($)':        t.pnl != null ? Number(Number(t.pnl).toFixed(2)) : '',
      'P&L (%)':        pnlPct,
      'Strategy':       t.strategy        ?? '',
      'Emotion':        t.emotion         ?? '',
      'Mistakes':       Array.isArray(t.mistakes) ? t.mistakes.join(', ') : '',
      'Session':        t.trading_session  ?? '',
      'Broker':         t.broker           ?? '',
      'Notes':          t.notes            ?? '',
      'Duration':       fmtDuration(ms),
      'Status':         t.status           ?? '',
    };
  });

  // ── Sheet 2: Summary ──────────────────────────────────────────────────────
  const wins    = closed.filter(t => Number(t.pnl) > 0);
  const losses  = closed.filter(t => Number(t.pnl) <= 0);
  const netPnl  = closed.reduce((s, t) => s + Number(t.pnl), 0);
  const winSum  = wins.reduce((s, t) => s + Number(t.pnl), 0);
  const lossAbs = Math.abs(losses.reduce((s, t) => s + Number(t.pnl), 0));
  const winRate = closed.length ? (wins.length / closed.length * 100) : 0;
  const pf      = lossAbs > 0 ? (winSum / lossAbs) : (wins.length > 0 ? 999 : 0);

  const best  = closed.reduce((b, t) => Number(t.pnl) > Number(b?.pnl ?? -Infinity) ? t : b, null as any);
  const worst = closed.reduce((w, t) => Number(t.pnl) < Number(w?.pnl ?? Infinity)  ? t : w, null as any);

  const byStrat   = buildBreakdown(closed, 'strategy');
  const byEmo     = buildBreakdown(closed, 'emotion');
  const bySess    = buildBreakdown(closed.filter(t => t.trading_session), 'trading_session');
  const dateRange = trades.length
    ? `${new Date(trades[0].opened_at).toLocaleDateString('en-GB')} – ${new Date(trades[trades.length - 1].opened_at).toLocaleDateString('en-GB')}`
    : '—';

  const summaryAoA: any[][] = [
    ['TradeLog Pro — Analytics Summary'],
    [],
    ['Export Date', new Date().toLocaleDateString('en-GB')],
    ['Date Range',  dateRange],
    [],
    ['OVERVIEW', '', '', ''],
    ['Total Closed Trades', closed.length],
    ['Win Rate',            winRate.toFixed(1) + '%'],
    ['Total P&L',           '$' + netPnl.toFixed(2)],
    ['Average Win',         wins.length   ? '$' + (winSum  / wins.length).toFixed(2)   : '—'],
    ['Average Loss',        losses.length ? '-$' + (lossAbs / losses.length).toFixed(2) : '—'],
    ['Profit Factor',       pf >= 999 ? '∞' : pf.toFixed(2)],
    ['Best Trade',          best  ? `${best.symbol}  +$${Number(best.pnl).toFixed(2)}`   : '—'],
    ['Worst Trade',         worst ? `${worst.symbol} -$${Math.abs(Number(worst.pnl)).toFixed(2)}` : '—'],
    [],
    ['P&L BY STRATEGY', '', '', ''],
    ['Strategy', 'Trades', 'Win Rate', 'Net P&L ($)'],
    ...byStrat.map(d => [d.name, d.count, (d.wins / d.count * 100).toFixed(1) + '%', Number(d.pnl.toFixed(2))]),
    [],
    ['P&L BY EMOTION', '', '', ''],
    ['Emotion', 'Trades', 'Win Rate', 'Net P&L ($)'],
    ...byEmo.map(d => [d.name, d.count, (d.wins / d.count * 100).toFixed(1) + '%', Number(d.pnl.toFixed(2))]),
  ];

  if (bySess.length > 0) {
    summaryAoA.push(
      [],
      ['P&L BY SESSION', '', '', ''],
      ['Session', 'Trades', 'Win Rate', 'Net P&L ($)'],
      ...bySess.map(d => [d.name, d.count, (d.wins / d.count * 100).toFixed(1) + '%', Number(d.pnl.toFixed(2))]),
    );
  }

  const wb  = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(tradeRows);
  const ws2 = XLSX.utils.aoa_to_sheet(summaryAoA);

  // Column widths for trades sheet
  ws1['!cols'] = [
    { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 14 },
    { wch: 24 }, { wch: 12 }, { wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 8 },
  ];
  ws2['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 12 }, { wch: 14 }];

  XLSX.utils.book_append_sheet(wb, ws1, 'Trades');
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
  XLSX.writeFile(wb, filename);
}
