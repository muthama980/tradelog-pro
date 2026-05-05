'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, ArrowLeft, CheckCircle, AlertTriangle, Loader2, FileText, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  parseCSVFile, ParsedTrade, ExchangeCard, ColumnMapping,
  isValidMapping, autoDetectColumns,
} from '@/lib/csvParsers';

type Step = 'choose' | 'upload' | 'mapping' | 'preview' | 'done';

interface Exchange {
  id: ExchangeCard;
  name: string;
  description: string;
  color: string;
  label: string;
  hint: string;
}

const EXCHANGES: Exchange[] = [
  { id: 'binance',    name: 'Binance',             description: 'Spot & Futures',          color: '#F0B90B', label: 'B',  hint: 'Export from: Orders → Order History → Export' },
  { id: 'bybit',     name: 'Bybit',               description: 'Spot & Perpetual',         color: '#F7941D', label: 'BY', hint: 'Export from: Orders → My Orders → Export' },
  { id: 'metatrader', name: 'MetaTrader 4/5',      description: 'Account History Report',   color: '#1A73E8', label: 'MT', hint: 'In MT: Account History → right-click → Save as Report (CSV)' },
  { id: 'generic',   name: 'Other (Generic CSV)', description: 'Any exchange / broker',    color: '#00D9FF', label: '+',  hint: 'We\'ll auto-detect columns or let you map them manually' },
];

const TRADE_FIELD_OPTIONS = [
  { value: '', label: '— ignore column —' },
  { value: 'date',          label: 'Date / Open Time' },
  { value: 'symbol',        label: 'Symbol / Pair' },
  { value: 'side',          label: 'Side / Direction' },
  { value: 'entry_price',   label: 'Entry Price' },
  { value: 'exit_price',    label: 'Exit Price' },
  { value: 'position_size', label: 'Position Size' },
  { value: 'fees',          label: 'Fees / Commission' },
  { value: 'pnl',           label: 'P&L / Profit' },
  { value: 'closed_at',     label: 'Close Time' },
];

function fmtPrice(v: number | null) {
  if (v == null) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function fmtPnl(v: number | null) {
  if (v == null) return '—';
  const s = v >= 0 ? '+' : '';
  return `${s}$${Math.abs(v).toFixed(2)}`;
}

export default function ImportPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep]                   = useState<Step>('choose');
  const [exchange, setExchange]           = useState<Exchange | null>(null);
  const [isDragging, setIsDragging]       = useState(false);
  const [fileName, setFileName]           = useState('');
  const [csvContent, setCsvContent]       = useState('');
  const [csvHeaders, setCsvHeaders]       = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({ date: null, symbol: null, side: null, entry_price: null, exit_price: null, position_size: null, fees: null, pnl: null, closed_at: null });
  const [parsedTrades, setParsedTrades]   = useState<ParsedTrade[]>([]);
  const [newTrades, setNewTrades]         = useState<ParsedTrade[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [importing, setImporting]         = useState(false);
  const [importResult, setImportResult]   = useState<{ imported: number; skipped: number } | null>(null);
  const [parseError, setParseError]       = useState('');

  function reset() {
    setStep('choose');
    setExchange(null);
    setFileName('');
    setCsvContent('');
    setCsvHeaders([]);
    setParsedTrades([]);
    setNewTrades([]);
    setDuplicateCount(0);
    setImportResult(null);
    setParseError('');
  }

  function selectExchange(ex: Exchange) {
    setExchange(ex);
    setStep('upload');
  }

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setParseError('Please upload a .csv file.');
      return;
    }
    setParseError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      processCSV(content, exchange!.id);
    };
    reader.readAsText(file);
  }

  function processCSV(content: string, exchangeCard: ExchangeCard, customMapping?: ColumnMapping) {
    try {
      const { trades, headers, needsMapping, columnMapping: detected } = parseCSVFile(content, exchangeCard, customMapping);

      if (needsMapping) {
        setCsvHeaders(headers);
        setColumnMapping(detected);
        setStep('mapping');
        return;
      }

      if (trades.length === 0) {
        setParseError('No trades found in this file. Check that you selected the correct exchange format.');
        return;
      }

      setCsvHeaders(headers);
      setParsedTrades(trades);
      runDuplicateCheck(trades);
    } catch {
      setParseError('Failed to parse CSV. Make sure the file is not empty or corrupted.');
    }
  }

  async function runDuplicateCheck(trades: ParsedTrade[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from('trades')
      .select('symbol, entry_price, opened_at')
      .eq('user_id', user.id);

    const existingKeys = new Set(
      (existing || []).map(t => `${t.symbol}|${t.entry_price}|${new Date(t.opened_at).toISOString().slice(0, 16)}`)
    );

    const fresh: ParsedTrade[] = [];
    let dupes = 0;
    for (const t of trades) {
      const key = `${t.symbol}|${t.entry_price}|${new Date(t.opened_at).toISOString().slice(0, 16)}`;
      if (existingKeys.has(key)) dupes++;
      else fresh.push(t);
    }

    setNewTrades(fresh);
    setDuplicateCount(dupes);
    setStep('preview');
  }

  function applyManualMapping() {
    if (!isValidMapping(columnMapping)) {
      setParseError('Please map at least: Date, Symbol, Side / Direction, and Entry Price.');
      return;
    }
    setParseError('');
    processCSV(csvContent, exchange!.id, columnMapping);
  }

  async function importTrades() {
    if (newTrades.length === 0) return;
    setImporting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setImporting(false); return; }

    const payload = newTrades.map(t => ({ ...t, user_id: user.id }));
    let imported = 0;

    for (let i = 0; i < payload.length; i += 50) {
      const { error } = await supabase.from('trades').insert(payload.slice(i, i + 50));
      if (!error) imported += Math.min(50, payload.length - i);
    }

    setImportResult({ imported, skipped: duplicateCount });
    setImporting(false);
    setStep('done');
  }

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [exchange]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateMapping(csvColumn: string, field: string) {
    setColumnMapping(prev => {
      const next = { ...prev };
      // Remove any existing assignment of this CSV column
      for (const k of Object.keys(next) as (keyof ColumnMapping)[]) {
        if (next[k] === csvColumn) next[k] = null;
      }
      if (field) next[field as keyof ColumnMapping] = csvColumn;
      return next;
    });
  }

  function getMappedField(csvColumn: string): string {
    for (const [k, v] of Object.entries(columnMapping)) {
      if (v === csvColumn) return k;
    }
    return '';
  }

  // ── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="p-8 md:p-10 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        {step !== 'choose' && step !== 'done' && (
          <button
            onClick={step === 'upload' ? reset : () => setStep(step === 'preview' ? 'upload' : 'upload')}
            className="flex items-center gap-1.5 text-text-muted hover:text-text text-sm mb-5 transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}
        <p className="mono-label mb-2">Import</p>
        <h1 className="text-3xl font-bold text-text tracking-tight">Import Trades</h1>
        <p className="text-text-muted mt-2 text-sm">
          {step === 'choose' && 'Choose your exchange or broker to get started.'}
          {step === 'upload' && `Upload your ${exchange?.name} CSV export.`}
          {step === 'mapping' && 'Map your CSV columns to trade fields.'}
          {step === 'preview' && 'Review detected trades before importing.'}
          {step === 'done' && 'Import complete.'}
        </p>
      </div>

      {/* ── STEP: Choose exchange ─────────────────────────────────────────── */}
      {step === 'choose' && (
        <div className="grid sm:grid-cols-2 gap-4">
          {EXCHANGES.map(ex => (
            <button
              key={ex.id}
              onClick={() => selectExchange(ex)}
              className="card rounded-xl p-6 text-left hover:border-accent/40 transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 font-mono font-black text-bg text-sm"
                  style={{ backgroundColor: ex.color }}
                >
                  {ex.label}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-text group-hover:text-accent transition-colors">{ex.name}</div>
                  <div className="text-text-muted text-sm mt-0.5">{ex.description}</div>
                  <div className="font-mono text-[10px] text-text-dim mt-2 leading-relaxed">{ex.hint}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── STEP: Upload ─────────────────────────────────────────────────── */}
      {step === 'upload' && exchange && (
        <div className="space-y-5">
          {/* Selected exchange badge */}
          <div className="flex items-center gap-3 p-4 card rounded-xl">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center font-mono font-black text-bg text-xs shrink-0" style={{ backgroundColor: exchange.color }}>
              {exchange.label}
            </div>
            <div>
              <div className="font-semibold text-text text-sm">{exchange.name}</div>
              <div className="text-text-dim text-xs">{exchange.hint}</div>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-14 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${
              isDragging ? 'border-accent bg-accent/5' : 'border-border hover:border-border-strong hover:bg-bg-elevated/50'
            }`}
          >
            {fileName ? (
              <>
                <FileText size={32} className="text-accent" strokeWidth={1.5} />
                <div className="text-center">
                  <div className="font-mono text-sm text-accent">{fileName}</div>
                  <div className="text-text-dim text-xs mt-1">Click to choose a different file</div>
                </div>
              </>
            ) : (
              <>
                <Upload size={32} className="text-text-dim" strokeWidth={1.5} />
                <div className="text-center">
                  <div className="text-text font-medium">Drop your CSV here</div>
                  <div className="text-text-muted text-sm mt-1">or click to browse files</div>
                  <div className="font-mono text-[10px] text-text-dim mt-2 uppercase tracking-widest">.csv files only</div>
                </div>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {parseError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-signal-red/10 border border-signal-red/20">
              <AlertTriangle size={16} className="text-signal-red shrink-0 mt-0.5" />
              <span className="text-signal-red text-sm">{parseError}</span>
            </div>
          )}
        </div>
      )}

      {/* ── STEP: Column Mapping ─────────────────────────────────────────── */}
      {step === 'mapping' && (
        <div className="space-y-6">
          <div className="card rounded-xl p-5">
            <p className="text-text-muted text-sm mb-4">
              We couldn't auto-detect all required columns. Map each CSV column to a trade field below.
              <span className="text-accent"> Required: Date, Symbol, Side, Entry Price.</span>
            </p>
            <div className="space-y-2">
              {csvHeaders.map(col => (
                <div key={col} className="grid grid-cols-2 gap-3 items-center">
                  <div className="font-mono text-xs text-text-muted bg-bg-elevated px-3 py-2 rounded-lg truncate">{col}</div>
                  <select
                    value={getMappedField(col)}
                    onChange={(e) => updateMapping(col, e.target.value)}
                    className="form-input text-sm"
                  >
                    {TRADE_FIELD_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {parseError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-signal-red/10 border border-signal-red/20">
              <AlertTriangle size={16} className="text-signal-red shrink-0 mt-0.5" />
              <span className="text-signal-red text-sm">{parseError}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep('upload')} className="btn-secondary">
              <ArrowLeft size={14} className="mr-2" /> Back
            </button>
            <button onClick={applyManualMapping} className="btn-primary">
              Preview trades →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: Preview ────────────────────────────────────────────────── */}
      {step === 'preview' && (
        <div className="space-y-6">
          {/* Summary banner */}
          <div className="card rounded-xl p-5 flex flex-wrap items-center gap-4 justify-between">
            <div>
              <div className="text-text font-semibold">
                Found <span className="text-accent">{parsedTrades.length}</span> trade{parsedTrades.length !== 1 ? 's' : ''} from {exchange?.name}
              </div>
              <div className="text-text-muted text-sm mt-0.5">
                <span className="text-signal-green font-medium">{newTrades.length} new</span> will be imported
                {duplicateCount > 0 && (
                  <span className="text-text-dim"> · {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''} skipped</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
              <span className="px-2 py-1 rounded bg-accent/10 text-accent border border-accent/20">
                {exchange?.name}
              </span>
              <span className="px-2 py-1 rounded bg-bg-elevated border border-border text-text-muted">
                {fileName}
              </span>
            </div>
          </div>

          {/* Preview table */}
          <div className="card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim">Preview (first 5 trades)</span>
              <span className="font-mono text-[10px] text-text-dim">{parsedTrades.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[550px]">
                <thead>
                  <tr className="font-mono text-[10px] tracking-widest text-text-dim uppercase border-b border-border bg-bg-elevated">
                    <th className="text-left p-4">Symbol</th>
                    <th className="text-left p-4">Dir</th>
                    <th className="text-right p-4">Entry</th>
                    <th className="text-right p-4">Exit</th>
                    <th className="text-right p-4">P&L</th>
                    <th className="text-right p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedTrades.slice(0, 5).map((t, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="p-4">
                        <div className="font-mono text-sm text-text">{t.symbol}</div>
                        <div className="font-mono text-[10px] text-text-dim uppercase">{t.market}</div>
                      </td>
                      <td className="p-4 text-sm capitalize text-text-muted">{t.direction}</td>
                      <td className="p-4 text-right font-mono text-sm text-text">{fmtPrice(t.entry_price)}</td>
                      <td className="p-4 text-right font-mono text-sm text-text">{fmtPrice(t.exit_price)}</td>
                      <td className={`p-4 text-right font-mono text-sm font-bold ${t.pnl == null ? 'text-text-dim' : t.pnl >= 0 ? 'text-signal-green' : 'text-signal-red'}`}>
                        {fmtPnl(t.pnl)}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded ${
                          t.status === 'open' ? 'border-accent/40 text-accent' : 'border-border text-text-dim'
                        }`}>{t.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedTrades.length > 5 && (
              <div className="p-3 text-center font-mono text-[10px] text-text-dim border-t border-border">
                + {parsedTrades.length - 5} more trades
              </div>
            )}
          </div>

          {newTrades.length === 0 && duplicateCount > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/5 border border-accent/20">
              <AlertTriangle size={16} className="text-accent shrink-0 mt-0.5" />
              <span className="text-accent text-sm">All {duplicateCount} trades already exist in your journal. Nothing to import.</span>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep('upload')} className="btn-secondary">
              <ArrowLeft size={14} className="mr-2" /> Back
            </button>
            <button
              onClick={importTrades}
              disabled={importing || newTrades.length === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <><Loader2 size={14} className="mr-2 animate-spin" /> Importing…</>
              ) : (
                `Import ${newTrades.length} trade${newTrades.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: Done ───────────────────────────────────────────────────── */}
      {step === 'done' && importResult && (
        <div className="space-y-6">
          <div className="card rounded-xl p-8 text-center">
            <CheckCircle size={44} className="text-signal-green mx-auto mb-4" strokeWidth={1.5} />
            <h2 className="text-2xl font-bold text-text mb-2">Import Complete</h2>
            <div className="flex items-center justify-center gap-6 mt-5">
              <div className="text-center">
                <div className="text-3xl font-bold text-signal-green tabular">{importResult.imported}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-text-dim mt-1">Trades imported</div>
              </div>
              {importResult.skipped > 0 && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-text-muted tabular">{importResult.skipped}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-text-dim mt-1">Duplicates skipped</div>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="btn-secondary">
              Import another file
            </button>
            <a href="/dashboard/journal" className="btn-primary">
              View journal →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
