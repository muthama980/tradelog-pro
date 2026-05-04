'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, X, Loader2, Pencil, ChevronDown } from 'lucide-react';
import { computePnl } from '@/lib/utils';

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

const BLANK_FORM = {
  symbol: '', market: 'crypto', direction: 'long',
  entry_price: '', exit_price: '', position_size: '', fees: '',
  strategy: '', emotion: '', notes: '',
  opened_at: new Date().toISOString().slice(0, 16),
};

export default function JournalPage() {
  const supabase = createClient();
  const [trades, setTrades]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState({ ...BLANK_FORM });
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);
  const [customStrategy, setCustomStrategy]     = useState('');
  const [showCustomStrategy, setShowCustomStrategy] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('trades').select('*').order('opened_at', { ascending: false });
    setTrades(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditingId(null);
    setForm({ ...BLANK_FORM, opened_at: new Date().toISOString().slice(0, 16) });
    setSelectedMistakes([]);
    setCustomStrategy('');
    setShowCustomStrategy(false);
    setShowForm(true);
  }

  function startEdit(trade: any) {
    setEditingId(trade.id);
    const isPreset = STRATEGY_PRESETS.includes(trade.strategy || '');
    setShowCustomStrategy(!isPreset && !!trade.strategy);
    setCustomStrategy(!isPreset ? (trade.strategy || '') : '');
    setForm({
      symbol:        trade.symbol,
      market:        trade.market,
      direction:     trade.direction,
      entry_price:   String(trade.entry_price),
      exit_price:    trade.exit_price ? String(trade.exit_price) : '',
      position_size: String(trade.position_size),
      fees:          trade.fees ? String(trade.fees) : '',
      strategy:      isPreset ? trade.strategy : '__custom__',
      emotion:       trade.emotion || '',
      notes:         trade.notes || '',
      opened_at:     new Date(trade.opened_at).toISOString().slice(0, 16),
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const entry    = Number(form.entry_price);
    const exit     = form.exit_price ? Number(form.exit_price) : null;
    const size     = Number(form.position_size);
    const fees     = Number(form.fees || 0);
    const pnl      = exit ? computePnl({ direction: form.direction as any, entry_price: entry, exit_price: exit, position_size: size, fees }) : null;
    const strategy = form.strategy === '__custom__' ? (customStrategy.trim() || null) : (form.strategy || null);

    const payload = {
      symbol:        form.symbol.toUpperCase(),
      market:        form.market,
      direction:     form.direction,
      entry_price:   entry,
      exit_price:    exit,
      position_size: size,
      fees,
      pnl,
      strategy,
      emotion:       form.emotion || null,
      notes:         form.notes || null,
      mistakes:      selectedMistakes.length > 0 ? selectedMistakes : null,
      opened_at:     new Date(form.opened_at).toISOString(),
      closed_at:     exit ? new Date().toISOString() : null,
      status:        exit ? 'closed' : 'open',
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

      {/* ── Form modal ─────────────────────────────────────────────────── */}
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
                    onChange={(e) => setForm({ ...form, market: e.target.value })}
                    className="form-input capitalize">
                    {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
              </div>

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

              {/* Strategy — searchable select + custom */}
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
                    {STRATEGY_PRESETS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
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

              {/* Emotion — categorized pills */}
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

              {/* Mistakes — multi-select pills */}
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
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="font-mono text-[10px] tracking-widest text-text-dim uppercase border-b border-border bg-bg-elevated">
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
                {trades.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                    <td className="p-4">
                      <div className="font-mono text-sm text-text">{t.symbol}</div>
                      <div className="font-mono text-[10px] text-text-dim uppercase tracking-wider">{t.market}</div>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
