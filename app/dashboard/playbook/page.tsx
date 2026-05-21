'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Plus, X, Loader2, ChevronLeft, MoreVertical,
  Pencil, Archive, Trash2, Play, Pause, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/ThemeProvider';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Playbook {
  id: string;
  name: string;
  description: string | null;
  market: string | null;
  timeframe: string | null;
  entry_rules: string | null;
  exit_rules: string | null;
  risk_per_trade: string | null;
  notes: string | null;
  status: 'active' | 'paused' | 'archived';
  created_at: string;
}

interface Trade {
  id: string;
  symbol: string;
  direction: string;
  strategy: string | null;
  emotion: string | null;
  pnl: string | number | null;
  r_multiple: string | number | null;
  opened_at: string;
  closed_at: string | null;
  status: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MARKETS    = ['Forex', 'Crypto', 'Stocks', 'Futures'];
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', 'Daily', 'Weekly'];
const TIME_RANGES = ['1W', '1M', '3M', '6M', '1Y', 'All'] as const;
type TimeRange = typeof TIME_RANGES[number];

const MARKET_COLOR: Record<string, string> = {
  Forex:   'text-accent border-accent/30 bg-accent/10',
  Crypto:  'text-amber-400 border-amber-400/30 bg-amber-400/10',
  Stocks:  'text-signal-green border-signal-green/30 bg-signal-green/10',
  Futures: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
};

const STATUS_STYLE: Record<string, string> = {
  active:   'text-signal-green border-signal-green/30 bg-signal-green/10',
  paused:   'text-amber-400 border-amber-400/30 bg-amber-400/10',
  archived: 'text-text-dim border-border bg-bg-elevated',
};

const BLANK: FormData = {
  name: '', description: '', market: '', timeframe: '',
  entry_rules: '', exit_rules: '', risk_per_trade: '', notes: '',
  status: 'active',
};

interface FormData {
  name: string; description: string; market: string; timeframe: string;
  entry_rules: string; exit_rules: string; risk_per_trade: string; notes: string;
  status: 'active' | 'paused' | 'archived';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cutoff(range: TimeRange): number {
  const days: Record<string, number> = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };
  return range === 'All' ? 0 : Date.now() - days[range] * 86_400_000;
}

function computeStats(trades: Trade[], name: string, range: TimeRange) {
  const threshold = cutoff(range);
  const matched = trades.filter(t =>
    t.strategy?.toLowerCase() === name.toLowerCase() &&
    t.status === 'closed' &&
    t.pnl != null &&
    (threshold === 0 || new Date(t.opened_at).getTime() >= threshold)
  );
  const sorted = [...matched].sort(
    (a, b) => new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime()
  );

  const wins    = sorted.filter(t => Number(t.pnl) > 0);
  const losses  = sorted.filter(t => Number(t.pnl) <= 0);
  const winSum  = wins.reduce((s, t) => s + Number(t.pnl), 0);
  const lossAbs = Math.abs(losses.reduce((s, t) => s + Number(t.pnl), 0));
  const netPnl  = sorted.reduce((s, t) => s + Number(t.pnl), 0);

  let cum = 0, peak = 0, maxDD = 0;
  const equity = sorted.map((t, i) => {
    cum += Number(t.pnl);
    if (cum > peak) peak = cum;
    if (peak - cum > maxDD) maxDD = peak - cum;
    return { i: i + 1, pnl: Number(cum.toFixed(2)) };
  });

  const withHold = sorted.filter(t => t.closed_at);
  const avgHoldMs = withHold.length
    ? withHold.reduce(
        (s, t) => s + new Date(t.closed_at!).getTime() - new Date(t.opened_at).getTime(), 0
      ) / withHold.length
    : 0;

  const rSamples = sorted.filter(t => t.r_multiple != null);
  const avgR = rSamples.length
    ? rSamples.reduce((s, t) => s + Number(t.r_multiple), 0) / rSamples.length
    : null;

  return {
    total:        sorted.length,
    winRate:      sorted.length ? (wins.length / sorted.length) * 100 : 0,
    netPnl,
    profitFactor: lossAbs > 0 ? winSum / lossAbs : wins.length > 0 ? Infinity : 0,
    avgWin:       wins.length ? winSum / wins.length : 0,
    avgLoss:      losses.length ? lossAbs / losses.length : 0,
    avgR,
    maxDrawdown:  maxDD,
    bestPnl:      sorted.length ? Math.max(...sorted.map(t => Number(t.pnl))) : 0,
    worstPnl:     sorted.length ? Math.min(...sorted.map(t => Number(t.pnl))) : 0,
    avgHoldMs,
    equity,
    recentTrades: [...sorted].reverse().slice(0, 20),
  };
}

function fmtHold(ms: number): string {
  if (!ms) return '—';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function fmtPnl(n: number, always = false): string {
  if (!always && n === 0) return '$0.00';
  return `${n >= 0 ? '+' : '-'}$${Math.abs(n).toFixed(2)}`;
}

function fmtPF(pf: number): string {
  if (pf === Infinity) return '∞';
  if (pf === 0) return '—';
  return pf.toFixed(2);
}

const POSITIVE_EMOTIONS = ['calm','confident','disciplined','patient','focused','in-the-zone'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlaybookPage() {
  const supabase = createClient();
  const { theme } = useTheme();

  const [playbooks,  setPlaybooks]  = useState<Playbook[]>([]);
  const [allTrades,  setAllTrades]  = useState<Trade[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [view,       setView]       = useState<'list' | 'detail'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeRange,  setTimeRange]  = useState<TimeRange>('All');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showForm,   setShowForm]   = useState(false);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [form,       setForm]       = useState<FormData>({ ...BLANK });
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState<string | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [pb, tr] = await Promise.all([
      supabase.from('playbooks').select('*').order('created_at', { ascending: false }),
      supabase.from('trades').select(
        'id,symbol,direction,strategy,emotion,pnl,r_multiple,opened_at,closed_at,status'
      ).order('opened_at', { ascending: true }),
    ]);
    setPlaybooks(pb.data ?? []);
    setAllTrades(tr.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Form actions ──────────────────────────────────────────────────────────

  function openAdd() {
    setEditingId(null);
    setForm({ ...BLANK });
    setShowForm(true);
  }

  function openEdit(pb: Playbook) {
    setEditingId(pb.id);
    setForm({
      name: pb.name, description: pb.description ?? '',
      market: pb.market ?? '', timeframe: pb.timeframe ?? '',
      entry_rules: pb.entry_rules ?? '', exit_rules: pb.exit_rules ?? '',
      risk_per_trade: pb.risk_per_trade ?? '', notes: pb.notes ?? '',
      status: pb.status,
    });
    setShowForm(true);
    setOpenMenuId(null);
  }

  async function saveForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name:           form.name.trim(),
      description:    form.description.trim()    || null,
      market:         form.market                || null,
      timeframe:      form.timeframe             || null,
      entry_rules:    form.entry_rules.trim()    || null,
      exit_rules:     form.exit_rules.trim()     || null,
      risk_per_trade: form.risk_per_trade.trim() || null,
      notes:          form.notes.trim()          || null,
      status:         form.status,
      updated_at:     new Date().toISOString(),
    };
    if (editingId) {
      await supabase.from('playbooks').update(payload).eq('id', editingId);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('playbooks').insert({ ...payload, user_id: user!.id });
    }
    setSaving(false);
    setShowForm(false);
    showToast(editingId ? 'Strategy updated.' : 'Strategy created.');
    load();
  }

  // ── Status / delete ───────────────────────────────────────────────────────

  async function setStatus(id: string, status: string) {
    await supabase.from('playbooks').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setOpenMenuId(null);
    load();
  }

  async function deletePlaybook(id: string) {
    await supabase.from('playbooks').delete().eq('id', id);
    setDeleteId(null);
    if (selectedId === id) { setView('list'); setSelectedId(null); }
    load();
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const selected = playbooks.find(p => p.id === selectedId) ?? null;
  const stats    = selected ? computeStats(allTrades, selected.name, timeRange) : null;

  const isLight      = theme === 'light';
  const axisStroke   = isLight ? '#D4D4D8' : '#27272A';
  const tickColor    = isLight ? '#52525B' : '#71717A';
  const tooltipBg    = isLight ? '#FFFFFF' : '#0A0A0B';
  const tooltipBorder = isLight ? '#E4E4E7' : '#00D9FF';
  const tooltipText  = isLight ? '#09090B' : '#FAFAFA';
  const tooltipLbl   = isLight ? '#52525B' : '#00D9FF';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 md:p-10 max-w-7xl">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-bg-elevated border border-signal-green/40 text-signal-green text-sm px-4 py-2.5 rounded-lg shadow-xl font-mono tracking-wide">
          {toast}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDeleteId(null)} />
          <div className="relative card rounded-xl p-8 max-w-sm w-full border-signal-red/20">
            <h3 className="font-bold text-text text-lg mb-2">Delete strategy?</h3>
            <p className="text-text-muted text-sm mb-6">
              This won't affect existing trade records — past journals stay intact.
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
              <button
                onClick={() => deletePlaybook(deleteId)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono text-[11px] tracking-widest uppercase bg-signal-red text-white hover:bg-signal-red/90 transition"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm flex items-start justify-center p-4 md:p-12 overflow-y-auto">
          <div className="card rounded-xl w-full max-w-2xl p-8 my-8 relative">
            <button onClick={() => setShowForm(false)} className="absolute top-5 right-5 text-text-dim hover:text-text transition">
              <X size={18} />
            </button>
            <p className="mono-label mb-2">{editingId ? 'Edit Strategy' : 'New Strategy'}</p>
            <h2 className="font-bold text-2xl text-text tracking-tight mb-7">
              {editingId ? 'Edit Playbook' : 'Add to Playbook'}
            </h2>
            <form onSubmit={saveForm} className="space-y-5">
              <FF label="Strategy Name *">
                <input
                  required autoFocus value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="form-input" placeholder='e.g. "London Breakout"'
                />
              </FF>
              <div className="grid md:grid-cols-2 gap-4">
                <FF label="Market">
                  <select value={form.market} onChange={e => setForm(f => ({ ...f, market: e.target.value }))} className="form-input">
                    <option value="">— select —</option>
                    {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </FF>
                <FF label="Timeframe">
                  <select value={form.timeframe} onChange={e => setForm(f => ({ ...f, timeframe: e.target.value }))} className="form-input">
                    <option value="">— select —</option>
                    {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FF>
              </div>
              <FF label="Description">
                <textarea rows={2} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="form-input resize-none" placeholder="Brief overview of this strategy…" />
              </FF>
              <FF label="Entry Rules">
                <textarea rows={3} value={form.entry_rules}
                  onChange={e => setForm(f => ({ ...f, entry_rules: e.target.value }))}
                  className="form-input resize-none"
                  placeholder="Describe when you enter a trade with this strategy…" />
              </FF>
              <FF label="Exit Rules">
                <textarea rows={3} value={form.exit_rules}
                  onChange={e => setForm(f => ({ ...f, exit_rules: e.target.value }))}
                  className="form-input resize-none"
                  placeholder="Describe your exit criteria, take profit, stop loss…" />
              </FF>
              <FF label="Risk Per Trade">
                <input value={form.risk_per_trade}
                  onChange={e => setForm(f => ({ ...f, risk_per_trade: e.target.value }))}
                  className="form-input" placeholder="e.g. 1% of account, 2R target" />
              </FF>
              <FF label="Notes">
                <textarea rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="form-input resize-none" placeholder="Any additional notes…" />
              </FF>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving
                    ? <Loader2 className="animate-spin" size={15} />
                    : editingId ? 'Save Changes' : 'Create Strategy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Menu backdrop */}
      {openMenuId && <div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-accent" size={28} />
        </div>

      ) : view === 'list' ? (
        /* ─────────────────── LIST ─────────────────── */
        <>
          <div className="flex items-start justify-between mb-8 gap-4">
            <div>
              <p className="mono-label mb-2">Playbook</p>
              <h1 className="text-3xl font-bold text-text tracking-tight">
                Define your strategies,<br className="hidden md:block" /> track their performance.
              </h1>
            </div>
            <button onClick={openAdd} className="btn-primary shrink-0">
              <Plus size={15} className="mr-2" /> Add Strategy
            </button>
          </div>

          {playbooks.length === 0 ? (
            <div className="card rounded-xl p-16 text-center">
              <BookOpen size={40} className="text-text-dim mx-auto mb-4" strokeWidth={1.2} />
              <p className="font-bold text-xl text-text mb-2">No strategies yet.</p>
              <p className="text-text-muted text-sm mb-6 max-w-sm mx-auto">
                Create your first strategy playbook to start tracking performance against your trades.
              </p>
              <button onClick={openAdd} className="btn-primary">
                <Plus size={15} className="mr-2" /> Create your first strategy
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {playbooks.map(pb => {
                const qs         = computeStats(allTrades, pb.name, 'All');
                const isMenuOpen = openMenuId === pb.id;
                return (
                  <div key={pb.id} className="card rounded-xl p-5 flex flex-col gap-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-text truncate">{pb.name}</h3>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {pb.market && (
                            <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded-full ${MARKET_COLOR[pb.market] ?? 'text-text-dim border-border'}`}>
                              {pb.market}
                            </span>
                          )}
                          {pb.timeframe && (
                            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-border text-text-dim rounded-full">
                              {pb.timeframe}
                            </span>
                          )}
                          <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded-full ${STATUS_STYLE[pb.status]}`}>
                            {pb.status}
                          </span>
                        </div>
                      </div>
                      {/* Three-dot menu */}
                      <div className="relative shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : pb.id); }}
                          className="p-1.5 rounded-lg text-text-dim hover:text-text hover:bg-bg-elevated transition-colors"
                        >
                          <MoreVertical size={15} />
                        </button>
                        {isMenuOpen && (
                          <div className="absolute right-0 top-8 z-30 w-40 bg-bg-surface border border-border rounded-lg shadow-2xl overflow-hidden">
                            <MenuItem icon={<Pencil size={13} />} label="Edit"    onClick={() => openEdit(pb)} />
                            {pb.status === 'active'   && <MenuItem icon={<Pause   size={13} />} label="Pause"   onClick={() => setStatus(pb.id, 'paused')} />}
                            {pb.status === 'paused'   && <MenuItem icon={<Play    size={13} />} label="Resume"  onClick={() => setStatus(pb.id, 'active')} />}
                            {pb.status !== 'archived' && <MenuItem icon={<Archive size={13} />} label="Archive" onClick={() => setStatus(pb.id, 'archived')} />}
                            {pb.status === 'archived' && <MenuItem icon={<Play    size={13} />} label="Restore" onClick={() => setStatus(pb.id, 'active')} />}
                            <div className="h-px bg-border mx-2 my-0.5" />
                            <MenuItem
                              icon={<Trash2 size={13} />} label="Delete"
                              onClick={() => { setDeleteId(pb.id); setOpenMenuId(null); }}
                              danger
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-3 gap-3 border-t border-border/50 pt-3">
                      <StatMini label="Trades"    value={qs.total > 0 ? String(qs.total)                        : '—'} />
                      <StatMini label="Win Rate"  value={qs.total > 0 ? `${qs.winRate.toFixed(0)}%`             : '—'} color={qs.total > 0 ? (qs.winRate >= 50 ? 'green' : 'red') : 'dim'} />
                      <StatMini label="Net P&L"   value={qs.total > 0 ? fmtPnl(qs.netPnl)                      : '—'} color={qs.total > 0 ? (qs.netPnl >= 0 ? 'green' : 'red') : 'dim'} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <StatMini label="Profit Factor" value={qs.total > 0 ? fmtPF(qs.profitFactor) : '—'} color={qs.total > 0 ? (qs.profitFactor > 1 ? 'green' : 'red') : 'dim'} />
                      <StatMini label="Avg R"         value={qs.avgR != null && qs.total > 0 ? qs.avgR.toFixed(2) : '—'} color={(qs.avgR ?? 0) > 0 ? 'green' : 'dim'} />
                    </div>

                    <button
                      onClick={() => { setSelectedId(pb.id); setView('detail'); setTimeRange('All'); }}
                      className="btn-secondary w-full justify-center text-xs py-2"
                    >
                      View Details
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>

      ) : (
        /* ─────────────────── DETAIL ─────────────────── */
        selected && (
          <>
            <button
              onClick={() => { setView('list'); setSelectedId(null); }}
              className="flex items-center gap-1.5 text-text-muted hover:text-text text-sm transition-colors mb-6"
            >
              <ChevronLeft size={15} /> Playbook
            </button>

            {/* Detail header */}
            <div className="flex items-start justify-between mb-6 gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-text tracking-tight">{selected.name}</h1>
                  <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded-full ${STATUS_STYLE[selected.status]}`}>
                    {selected.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selected.market && (
                    <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded-full ${MARKET_COLOR[selected.market] ?? 'text-text-dim border-border'}`}>
                      {selected.market}
                    </span>
                  )}
                  {selected.timeframe && (
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-border text-text-dim rounded-full">
                      {selected.timeframe}
                    </span>
                  )}
                </div>
                {selected.description && (
                  <p className="text-text-muted text-sm max-w-xl">{selected.description}</p>
                )}
              </div>
              <button
                onClick={() => openEdit(selected)}
                className="btn-secondary shrink-0 flex items-center gap-2 text-sm py-2 px-4"
              >
                <Pencil size={13} /> Edit
              </button>
            </div>

            {/* Rules cards */}
            {(selected.entry_rules || selected.exit_rules || selected.risk_per_trade) && (
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {selected.entry_rules && (
                  <div className="card rounded-xl p-4">
                    <p className="mono-label mb-2">Entry Rules</p>
                    <p className="text-sm text-text-muted whitespace-pre-wrap leading-relaxed">{selected.entry_rules}</p>
                  </div>
                )}
                {selected.exit_rules && (
                  <div className="card rounded-xl p-4">
                    <p className="mono-label mb-2">Exit Rules</p>
                    <p className="text-sm text-text-muted whitespace-pre-wrap leading-relaxed">{selected.exit_rules}</p>
                  </div>
                )}
                {selected.risk_per_trade && (
                  <div className="card rounded-xl p-4">
                    <p className="mono-label mb-2">Risk Management</p>
                    <p className="text-sm text-text-muted whitespace-pre-wrap leading-relaxed">{selected.risk_per_trade}</p>
                  </div>
                )}
              </div>
            )}

            {/* Performance header + time filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="mono-label">Performance</p>
              <div className="flex items-center gap-1 bg-bg-elevated border border-border rounded-lg p-1">
                {TIME_RANGES.map(r => (
                  <button
                    key={r} onClick={() => setTimeRange(r)}
                    className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors ${
                      timeRange === r ? 'bg-accent text-bg font-black' : 'text-text-dim hover:text-text'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {stats?.total === 0 ? (
              <div className="card rounded-xl p-12 text-center">
                <TrendingUp size={32} className="text-text-dim mx-auto mb-3" strokeWidth={1.2} />
                <p className="font-bold text-text mb-1">No trades yet</p>
                <p className="text-text-muted text-sm max-w-sm mx-auto">
                  Tag trades with <span className="text-accent">"{selected.name}"</span> in the Journal to see performance here.
                </p>
              </div>
            ) : stats ? (
              <>
                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                  <StatCard label="Total Trades"  value={String(stats.total)} />
                  <StatCard label="Win Rate"      value={`${stats.winRate.toFixed(1)}%`}     color={stats.winRate >= 50 ? 'green' : 'red'} />
                  <StatCard label="Net P&L"       value={fmtPnl(stats.netPnl)}               color={stats.netPnl >= 0 ? 'green' : 'red'} />
                  <StatCard label="Profit Factor" value={fmtPF(stats.profitFactor)}          color={stats.profitFactor > 1 ? 'green' : 'red'} />
                  <StatCard label="Avg Win"       value={stats.avgWin > 0 ? `+$${stats.avgWin.toFixed(2)}` : '—'} color="green" />
                  <StatCard label="Avg Loss"      value={stats.avgLoss > 0 ? `-$${stats.avgLoss.toFixed(2)}` : '—'} />
                  <StatCard label="Max Drawdown"  value={stats.maxDrawdown > 0 ? `-$${stats.maxDrawdown.toFixed(2)}` : '—'} color={stats.maxDrawdown > 0 ? 'red' : undefined} />
                  <StatCard label="Best Trade"    value={fmtPnl(stats.bestPnl)}  color="green" />
                  <StatCard label="Worst Trade"   value={fmtPnl(stats.worstPnl)} color={stats.worstPnl < 0 ? 'red' : undefined} />
                  <StatCard label="Avg Hold Time" value={fmtHold(stats.avgHoldMs)} />
                </div>

                {/* Equity curve */}
                <div className="card rounded-xl p-6 mb-5">
                  <h3 className="font-bold text-base text-text mb-4">Equity Curve</h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.equity} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#00D9FF" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#00D9FF" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="i"
                          tick={{ fill: tickColor, fontSize: 10, fontFamily: 'var(--font-geist-mono)' }}
                          axisLine={{ stroke: axisStroke }} tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: tickColor, fontSize: 10, fontFamily: 'var(--font-geist-mono)' }}
                          axisLine={{ stroke: axisStroke }} tickLine={false}
                          tickFormatter={v => `$${v}`} width={60}
                        />
                        <Tooltip
                          contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontFamily: 'var(--font-geist-mono)', fontSize: 12, color: tooltipText }}
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
                  </div>
                </div>

                {/* Recent trades table */}
                <div className="card rounded-xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border">
                    <h3 className="font-bold text-sm text-text">Recent Trades</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px]">
                      <thead>
                        <tr className="font-mono text-[10px] tracking-widest text-text-dim uppercase border-b border-border bg-bg-elevated">
                          <th className="text-left px-5 py-3">Date</th>
                          <th className="text-left px-5 py-3">Symbol</th>
                          <th className="text-left px-5 py-3">Dir</th>
                          <th className="text-left px-5 py-3 hidden sm:table-cell">Emotion</th>
                          <th className="text-right px-5 py-3">P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentTrades.map(t => (
                          <tr key={t.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                            <td className="px-5 py-3 font-mono text-[11px] text-text-dim whitespace-nowrap">
                              {new Date(t.opened_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </td>
                            <td className="px-5 py-3 font-mono text-sm text-text">{t.symbol}</td>
                            <td className="px-5 py-3 text-sm text-text-muted capitalize">{t.direction}</td>
                            <td className="px-5 py-3 hidden sm:table-cell">
                              {t.emotion && (
                                <span className={`font-mono text-[10px] uppercase tracking-wider ${
                                  POSITIVE_EMOTIONS.includes(t.emotion) ? 'text-signal-green' : 'text-signal-red'
                                }`}>
                                  {t.emotion}
                                </span>
                              )}
                            </td>
                            <td className={`px-5 py-3 text-right font-mono text-sm tabular font-bold ${Number(t.pnl) >= 0 ? 'text-signal-green' : 'text-signal-red'}`}>
                              {fmtPnl(Number(t.pnl))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </>
        )
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mono-label mb-2 block">{label}</label>
      {children}
    </div>
  );
}

function MenuItem({
  icon, label, onClick, danger = false,
}: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
        danger
          ? 'text-signal-red hover:bg-signal-red/10'
          : 'text-text-muted hover:bg-bg-elevated hover:text-text'
      }`}
    >
      {icon} {label}
    </button>
  );
}

type Color = 'green' | 'red' | 'dim' | undefined;

function colorClass(c: Color) {
  if (c === 'green') return 'text-signal-green';
  if (c === 'red')   return 'text-signal-red';
  if (c === 'dim')   return 'text-text-dim';
  return 'text-text';
}

function StatMini({ label, value, color }: { label: string; value: string; color?: Color }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim mb-0.5">{label}</p>
      <p className={`font-mono text-sm font-bold tabular ${colorClass(color)}`}>{value}</p>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: Color }) {
  return (
    <div className="card rounded-xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim mb-1">{label}</p>
      <p className={`font-mono text-lg font-bold tabular ${colorClass(color)}`}>{value}</p>
    </div>
  );
}
