'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, X, Loader2, Pencil, ChevronDown, Trash2, AlertTriangle } from 'lucide-react';
import { computePnl } from '@/lib/utils';

// ─── Broker list ─────────────────────────────────────────────────────────────
const BROKERS = [
  'Binance','Coinbase','Kraken','OKX','Exness','XM',
  'IC Markets','Vantage','Pepperstone','FXTM','Deriv',
  'MetaTrader','TradingView',
];

// ─── Strategy presets ────────────────────────────────────────────────────────
const STRATEGY_PRESETS = [
  'breakout','trend-follow','mean-reversion','scalp','swing',
  'news','support-resistance','range-trading','momentum','pullback',
  'gap-fill','reversal','channel-trading','fibonacci',
  'order-block','liquidity-grab','fair-value-gap',
];

// ─── Emotions ────────────────────────────────────────────────────────────────
const EMOTIONS_POSITIVE = ['calm','confident','disciplined','patient','focused','in-the-zone'];
const EMOTIONS_NEGATIVE = ['fomo','revenge','fear','greed','impatient','frustrated','anxious','overconfident','bored','desperate','angry','euphoric'];

// ─── Mistakes ────────────────────────────────────────────────────────────────
const MISTAKE_OPTIONS = [
  'Overtrading','Revenge trading','Early exit','No stop loss',
  'Moved stop loss','FOMO entry','Wrong position size',
  'Ignored setup rules','Traded during news','Chased the market',
];

const MARKETS = ['crypto','forex','stocks','futures','other'];

// ─── Trading sessions ────────────────────────────────────────────────────────
const TRADING_SESSIONS = [
  { value: 'asian',                    label: 'Asian (Tokyo)' },
  { value: 'european',                 label: 'European (London)' },
  { value: 'american',                 label: 'American (New York)' },
  { value: 'pacific',                  label: 'Pacific (Sydney)' },
  { value: 'asia-europe-overlap',      label: 'Overlap: Asia – Europe' },
  { value: 'europe-america-overlap',   label: 'Overlap: Europe – America' },
];

const SESSION_MARKETS = ['forex', 'futures'];

const BLANK_FORM = {
  symbol: '', market: 'crypto', direction: 'long',
  entry_price: '', exit_price: '', position_size: '', fees: '',
  strategy: '', emotion: '', notes: '',
  opened_at: new Date().toISOString().slice(0, 16),
  trading_session: '',
  broker: '',
};

export default function JournalPage() {
  const supabase = createClient();
  const [trades, setTrades]             = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [form, setForm]                 = useState({ ...BLANK_FORM });
  const [selectedMistakes, setSelectedMistakes]         = useState<string[]>([]);
  const [customStrategy, setCustomStrategy]             = useState('');
  const [showCustomStrategy, setShowCustomStrategy]     = useState(false);
  const [playbookNames, setPlaybookNames]               = useState<string[]>([]);
  const [customBroker, setCustomBroker]                 = useState('');
  const [showCustomBroker, setShowCustomBroker]         = useState(false);

  // Bulk delete state
  const [selectedIds, setSelectedIds]     = useState<string[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting]   = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('trades').select('*').order('opened_at', { ascending: false });
    setTrades(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    supabase.from('playbooks').select('name').order('name').then(({ data }) => {
      if (data) setPlaybookNames(data.map((p: any) => p.name));
    });
  }, []);

  function openNew() {
    setEditingId(null);
    setForm({ ...BLANK_FORM, opened_at: new Date().toISOString().slice(0, 16) });
    setSelectedMistakes([]);
    setCustomStrategy('');
    setShowCustomStrategy(false);
    setCustomBroker('');
    setShowCustomBroker(false);
    setShowForm(true);
  }

  function startEdit(trade: any) {
    setEditingId(trade.id);
    const isPreset = STRATEGY_PRESETS.includes(trade.strategy || '') || playbookNames.includes(trade.strategy || '');
    setShowCustomStrategy(!isPreset && !!trade.strategy);
    const isPresetBroker = BROKERS.includes(trade.broker || '');
    setShowCustomBroker(!isPresetBroker && !!trade.broker);
    setCustomBroker(!isPresetBroker ? (trade.broker || '') : '');
    setCustomStrategy(!isPreset ? (trade.strategy || '') : '');
    setForm({
      symbol:           trade.symbol,
      market:           trade.market,
      direction:        trade.direction,
      entry_price:      String(trade.entry_price),
      exit_price:       trade.exit_price ? String(trade.exit_price) : '',
      position_size:    String(trade.position_size),
      fees:             trade.fees ? String(trade.fees) : '',
      strategy:         isPreset ? trade.strategy : '__custom__',
      emotion:          trade.emotion || '',
      notes:            trade.notes || '',
      opened_at:        new Date(trade.opened_at).toISOString().slice(0, 16),
      trading_session:  trade.trading_session || '',
      broker:           isPresetBroker ? (trade.broker || '') : (trade.broker ? '__other__' : ''),
    });
    setSelectedMistakes(Array.isArray(trade.mistakes) ? trade.mistakes : []);
    setShowForm(true);
  }

  function closeModal() {
    setShowForm(false);
    setEditingId(null);
  }

  function toggleMistake(m: string) {
    setSelectedMistakes((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  // ── Selection helpers ──────────────────────────────────────────────────────
  const allSelected = trades.length > 0 && trades.every(t => selectedIds.includes(t.id));

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : trades.map(t => t.id));
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function bulkDelete() {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    await supabase.from('trades').delete().in('id', selectedIds);
    setSelectedIds([]);
    setShowBulkConfirm(false);
    setBulkDeleting(false);
    load();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const entry    = Number(form.entry_price);
    const exit     = form.exit_price ? Number(form.exit_price) : null;
    const size     = Number(form.position_size);
    const fees     = Number(form.fees || 0);
    const pnl      = exit ? computePnl({ direction: form.direction as any, entry_price: entry, exit_price: exit, position_size: size, fees }) : null;
    const strategy = form.strategy === '__custom__' ? (customStrategy.trim() || null) : (form.strategy || null);
    const broker   = form.broker   === '__other__'  ? (customBroker.trim()   || null) : (form.broker   || null);

    const payload = {
      symbol:           form.symbol.toUpperCase(),
      market:           form.market,
      direction:        form.direction,
      entry_price:      entry,
      exit_price:       exit,
      position_size:    size,
      fees,
      pnl,
      strategy,
      emotion:          form.emotion || null,
      notes:            form.notes || null,
      mistakes:         selectedMistakes.length > 0 ? selectedMistakes : null,
      opened_at:        new Date(form.opened_at).toISOString(),
      closed_at:        exit ? new Date().toISOString() : null,
      status:           exit ? 'closed' : 'open',
      trading_session:  SESSION_MARKETS.includes(form.market) && form.trading_session ? form.trading_session : null,
      broker,
    };

    let error: any = null;
    if (editingId) {
      ({ error } = await supabase.from('trades').update(payload).eq('id', editingId));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSubmitting(false); return; }
      ({ error } = await supabase.from('trades').insert({ ...payload, user_id: user.id }));
    }

    setSubmitting(false);
    if (error) { alert(error.message); return; }
    closeModal();
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this trade?')) return;
    await supabase.from('trades').delete().eq('id', id);
    load();
  }

  return (
    <div className="p-8 md:p-10 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="mono-label mb-2">Journal</p>
          <h1 className="text-3xl font-bold text-text tracking-tight">Every trade. Every decision.</h1>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus size={15} className="mr-2" /> New Trade
        </button>
      </div>

      {/* ── Trade log form modal ──────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm flex items-start justify-center p-4 md:p-12 overflow-y-auto">
          <div className="card rounded-xl w-full max-w-2xl p-8 my-8 relative">
            <button onClick={closeModal} className="absolute top-5 right-5 text-text-dim hover:text-text transition">
              <X size={18} />
            </button>
            <p className="mono-label mb-2">{editingId ? 'Edit Entry' : 'New Entry'}</p>
            <h2 className="font-bold text-2xl text-text tracking-tight mb-7">
              {editingId ? 'Edit Trade' : 'Log a Trade'}
            </h2>

            <form onSubmit={submit} className="space-y-5">
              {/* Symbol + Market */}
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Symbol">
                  <input required value={form.symbol}
                    onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                    className="form-input" placeholder="BTC/USDT" />
                </Field>
                <Field label="Market">
                  <select value={form.market}
                    onChange={(e) => setForm({ ...form, market: e.target.value, trading_session: '' })}
                    className="form-input capitalize">
                    {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
              </div>

              {/* Trading Session — only for forex / futures */}
              {SESSION_MARKETS.includes(form.market) && (
                <Field label="Trading Session (optional)">
                  <div className="relative">
                    <select
                      value={form.trading_session}
                      onChange={(e) => setForm({ ...form, trading_session: e.target.value })}
                      className="form-input appearance-none pr-8"
                    >
                      <option value="">— select session —</option>
                      {TRADING_SESSIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                  </div>
                </Field>
              )}

              {/* Direction + Entry + Exit */}
              <div className="grid md:grid-cols-3 gap-4">
                <Field label="Direction">
                  <select value={form.direction}
                    onChange={(e) => setForm({ ...form, direction: e.target.value })}
                    className="form-input">
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                </Field>
                <Field label="Entry Price">
                  <input required type="number" step="any" value={form.entry_price}
                    onChange={(e) => setForm({ ...form, entry_price: e.target.value })}
                    className="form-input" placeholder="42500" />
                </Field>
                <Field label="Exit Price (optional)">
                  <input type="number" step="any" value={form.exit_price}
                    onChange={(e) => setForm({ ...form, exit_price: e.target.value })}
                    className="form-input" placeholder="43200" />
                </Field>
              </div>

              {/* Size + Fees */}
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Position Size">
                  <input required type="number" step="any" value={form.position_size}
                    onChange={(e) => setForm({ ...form, position_size: e.target.value })}
                    className="form-input" placeholder="0.25" />
                </Field>
                <Field label="Fees (USD)">
                  <input type="number" step="any" value={form.fees}
                    onChange={(e) => setForm({ ...form, fees: e.target.value })}
                    className="form-input" placeholder="2.50" />
                </Field>
              </div>

              {/* Broker */}
              <Field label="Broker (optional)">
                <div className="relative">
                  <select
                    value={showCustomBroker ? '__other__' : form.broker}
                    onChange={(e) => {
                      if (e.target.value === '__other__') {
                        setShowCustomBroker(true);
                        setForm({ ...form, broker: '__other__' });
                      } else {
                        setShowCustomBroker(false);
                        setCustomBroker('');
                        setForm({ ...form, broker: e.target.value });
                      }
                    }}
                    className="form-input appearance-none pr-8"
                  >
                    <option value="">— select broker —</option>
                    {BROKERS.map(b => <option key={b} value={b}>{b}</option>)}
                    <option value="__other__">Other…</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                </div>
                {showCustomBroker && (
                  <input
                    type="text"
                    value={customBroker}
                    onChange={(e) => setCustomBroker(e.target.value)}
                    className="form-input mt-2"
                    placeholder="Enter broker name…"
                    autoFocus
                  />
                )}
              </Field>

              {/* Strategy */}
              <Field label="Strategy">
                <div className="relative">
                  <select
                    value={showCustomStrategy ? '__custom__' : form.strategy}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setShowCustomStrategy(true);
                        setForm({ ...form, strategy: '__custom__' });
                      } else {
                        setShowCustomStrategy(false);
                        setCustomStrategy('');
                        setForm({ ...form, strategy: e.target.value });
                      }
                    }}
                    className="form-input appearance-none pr-8"
                  >
                    <option value="">— select strategy —</option>
                    {playbookNames.length > 0 && (
                      <optgroup label="My Playbooks">
                        {playbookNames.map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label={playbookNames.length > 0 ? 'Presets' : ''}>
                      {STRATEGY_PRESETS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </optgroup>
                    <option value="__custom__">Add custom…</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                </div>
                {showCustomStrategy && (
                  <input
                    type="text"
                    value={customStrategy}
                    onChange={(e) => setCustomStrategy(e.target.value)}
                    className="form-input mt-2"
                    placeholder="Type your strategy name…"
                    autoFocus
                  />
                )}
              </Field>

              {/* Emotion */}
              <Field label="Emotion">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {EMOTIONS_POSITIVE.map(e => (
                      <button
                        key={e} type="button"
                        onClick={() => setForm({ ...form, emotion: form.emotion === e ? '' : e })}
                        className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
                          form.emotion === e
                            ? 'bg-signal-green/20 border-signal-green text-signal-green'
                            : 'border-signal-green/30 text-signal-green/70 hover:border-signal-green/60'
                        }`}
                      >{e}</button>
                    ))}
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex flex-wrap gap-1.5">
                    {EMOTIONS_NEGATIVE.map(e => (
                      <button
                        key={e} type="button"
                        onClick={() => setForm({ ...form, emotion: form.emotion === e ? '' : e })}
                        className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
                          form.emotion === e
                            ? 'bg-signal-red/20 border-signal-red text-signal-red'
                            : 'border-signal-red/30 text-signal-red/70 hover:border-signal-red/60'
                        }`}
                      >{e}</button>
                    ))}
                  </div>
                  {form.emotion && (
                    <button type="button" onClick={() => setForm({ ...form, emotion: '' })}
                      className="font-mono text-[10px] text-text-dim hover:text-text transition">
                      × clear emotion
                    </button>
                  )}
                </div>
              </Field>

              {/* Mistakes */}
              <Field label="Mistakes (select all that apply)">
                <div className="flex flex-wrap gap-1.5">
                  {MISTAKE_OPTIONS.map(m => {
                    const active = selectedMistakes.includes(m);
                    return (
                      <button
                        key={m} type="button"
                        onClick={() => toggleMistake(m)}
                        className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
                          active
                            ? 'bg-accent/15 border-accent text-accent'
                            : 'border-border text-text-muted hover:border-accent/40 hover:text-text'
                        }`}
                      >{m}</button>
                    );
                  })}
                </div>
              </Field>

              {/* Opened at */}
              <Field label="Opened At">
                <input type="datetime-local" required value={form.opened_at}
                  onChange={(e) => setForm({ ...form, opened_at: e.target.value })}
                  className="form-input" />
              </Field>

              {/* Notes */}
              <Field label="Notes">
                <textarea rows={3} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="form-input resize-none"
                  placeholder="Why did you take this trade? What was the setup?" />
              </Field>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                  {submitting
                    ? <Loader2 className="animate-spin" size={15} />
                    : editingId ? 'Save Changes' : 'Log Trade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk delete confirmation modal ───────────────────────────────── */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowBulkConfirm(false)} />
          <div className="relative card rounded-xl p-8 max-w-sm w-full border-signal-red/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg border border-signal-red/30 bg-signal-red/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="text-signal-red" size={16} />
              </div>
              <h3 className="font-bold text-text text-lg">Delete {selectedIds.length} {selectedIds.length === 1 ? 'trade' : 'trades'}?</h3>
            </div>
            <p className="text-text-muted text-sm leading-relaxed mb-6">
              This will permanently delete {selectedIds.length} selected {selectedIds.length === 1 ? 'trade' : 'trades'}. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkConfirm(false)}
                className="btn-secondary flex-1 justify-center"
              >
                Cancel
              </button>
              <button
                onClick={bulkDelete}
                disabled={bulkDeleting}
                className="flex-1 justify-center flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-[11px] tracking-widest uppercase bg-signal-red text-white hover:bg-signal-red/90 transition disabled:opacity-60"
              >
                {bulkDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Trade list ──────────────────────────────────────────────────── */}
      <div className="card rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-dim">Loading…</div>
        ) : trades.length === 0 ? (
          <div className="p-14 text-center">
            <p className="font-bold text-xl text-text mb-2">Your journal is blank.</p>
            <p className="text-text-muted mb-6 max-w-sm mx-auto text-sm">Log your first trade to begin building your edge.</p>
            <button onClick={openNew} className="btn-primary">
              <Plus size={15} className="mr-2" /> Log first trade
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="font-mono text-[10px] tracking-widest text-text-dim uppercase border-b border-border bg-bg-elevated">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="accent-[#00D9FF] cursor-pointer"
                      title="Select all"
                    />
                  </th>
                  <th className="text-left p-4">Symbol</th>
                  <th className="text-left p-4 hidden lg:table-cell">Dir</th>
                  <th className="text-left p-4 hidden md:table-cell">Strategy</th>
                  <th className="text-left p-4 hidden md:table-cell">Emotion</th>
                  <th className="text-right p-4">P&L</th>
                  <th className="text-right p-4">Status</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => {
                  const isSelected = selectedIds.includes(t.id);
                  return (
                    <tr key={t.id} className={`border-b border-border/50 transition-colors ${isSelected ? 'bg-accent/5' : 'hover:bg-bg-elevated/50'}`}>
                      <td className="p-4 w-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(t.id)}
                          className="accent-[#00D9FF] cursor-pointer"
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-sm text-text">{t.symbol}</div>
                        <div className="font-mono text-[10px] text-text-dim uppercase tracking-wider">{t.market}</div>
                        {t.trading_session && (
                          <div className="font-mono text-[9px] text-accent/70 uppercase tracking-wider mt-0.5">
                            {TRADING_SESSIONS.find(s => s.value === t.trading_session)?.label ?? t.trading_session}
                          </div>
                        )}
                        {t.broker && (
                          <div className="font-mono text-[9px] text-text-dim uppercase tracking-wider mt-0.5">{t.broker}</div>
                        )}
                        {t.mistakes && t.mistakes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {t.mistakes.slice(0, 2).map((m: string) => (
                              <span key={m} className="font-mono text-[9px] uppercase tracking-wider text-signal-red/70 border border-signal-red/20 px-1.5 py-px rounded">
                                {m}
                              </span>
                            ))}
                            {t.mistakes.length > 2 && (
                              <span className="font-mono text-[9px] text-text-dim">+{t.mistakes.length - 2}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4 hidden lg:table-cell text-sm text-text-muted capitalize">{t.direction}</td>
                      <td className="p-4 hidden md:table-cell">
                        {t.strategy && (
                          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-border rounded text-text-dim">
                            {t.strategy}
                          </span>
                        )}
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        {t.emotion && (
                          <span className={`font-mono text-[10px] uppercase tracking-wider ${
                            ['calm','confident','disciplined','patient','focused','in-the-zone'].includes(t.emotion)
                              ? 'text-signal-green' : 'text-signal-red'
                          }`}>
                            {t.emotion}
                          </span>
                        )}
                      </td>
                      <td className={`p-4 text-right font-mono text-sm tabular font-bold whitespace-nowrap ${Number(t.pnl) >= 0 ? 'text-signal-green' : 'text-signal-red'}`}>
                        {t.pnl != null ? `${Number(t.pnl) >= 0 ? '+' : ''}$${Number(t.pnl).toFixed(2)}` : '—'}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded ${
                          t.status === 'open' ? 'border-accent/40 text-accent' : 'border-border text-text-dim'
                        }`}>{t.status}</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => startEdit(t)} className="text-text-dim hover:text-accent text-xs transition flex items-center gap-1">
                            <Pencil size={11} /> Edit
                          </button>
                          <button onClick={() => remove(t.id)} className="text-text-dim hover:text-signal-red text-xs transition">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Floating bulk action bar ─────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-bg-elevated border border-border rounded-xl px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <span className="font-mono text-sm text-text-muted">
            <span className="text-text font-bold">{selectedIds.length}</span> {selectedIds.length === 1 ? 'trade' : 'trades'} selected
          </span>
          <div className="h-4 w-px bg-border" />
          <button
            onClick={() => setSelectedIds([])}
            className="font-mono text-[11px] text-text-dim hover:text-text transition tracking-wider"
          >
            Clear
          </button>
          <button
            onClick={() => setShowBulkConfirm(true)}
            className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-signal-red hover:text-white hover:bg-signal-red border border-signal-red/40 hover:border-signal-red rounded-lg px-3 py-1.5 transition"
          >
            <Trash2 size={12} />
            Delete selected
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mono-label mb-2 block">{label}</label>
      {children}
    </div>
  );
}
