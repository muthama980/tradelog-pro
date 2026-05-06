'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Plug, RefreshCw, Trash2, X, Loader2, CheckCircle, AlertCircle,
  Clock, Upload,
} from 'lucide-react';

interface Connection {
  id: string;
  exchange: 'binance' | 'bybit';
  status: 'active' | 'error' | 'disconnected';
  last_synced_at: string | null;
  error_message: string | null;
}

interface SyncResult {
  imported: number;
  message: string;
}

interface CsvTrade {
  symbol: string;
  market: string;
  direction: 'long' | 'short';
  entry_price: number;
  exit_price: number | null;
  position_size: number;
  fees: number;
  pnl: number | null;
  opened_at: string;
  closed_at: string | null;
  status: 'open' | 'closed';
}

const EXCHANGES = [
  {
    id: 'bybit' as const,
    name: 'Bybit',
    color: '#F7941D',
    label: 'BY',
    instructions: [
      'Go to Bybit → Account → API Management',
      'Click "Create New Key" → select "System-generated API Keys"',
      'Label it "TradeLog Pro" and enable ONLY "Read" permission',
      'Do NOT enable Trading, Withdrawal, or Transfer',
      'Complete 2FA verification and copy the API Key and Secret',
    ],
  },
  {
    id: 'binance' as const,
    name: 'Binance',
    color: '#F0B90B',
    label: 'B',
    instructions: [
      'Go to Binance → Account → API Management',
      'Click "Create API" → select "System generated"',
      'Label it "TradeLog Pro"',
      'Enable ONLY "Enable Reading" permission',
      'Do NOT enable Spot, Margin, Futures Trading or Withdrawals',
      'Complete security verification and copy the API Key and Secret',
    ],
  },
];

const CSV_SOURCES = [
  { id: 'binance',     name: 'Binance',          color: '#F0B90B', label: 'B',  hint: 'Spot & Futures history' },
  { id: 'bybit',       name: 'Bybit',             color: '#F7941D', label: 'BY', hint: 'Perpetuals history' },
  { id: 'metatrader',  name: 'MetaTrader 4 / 5',  color: '#1565C0', label: 'MT', hint: 'Forex & CFD statements' },
  { id: 'generic',     name: 'Other / Generic',   color: '#52525B', label: '?',  hint: 'Any trade CSV' },
];

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ConnectionsPage() {
  // API connections state
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingExchange, setConnectingExchange] = useState<'binance' | 'bybit' | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});

  // Tab + CSV import state
  const [tab, setTab] = useState<'api' | 'csv'>('api');
  const [csvFormat, setCsvFormat] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [previewTrades, setPreviewTrades] = useState<CsvTrade[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/connections');
    if (res.ok) setConnections(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openConnectModal(exchange: 'binance' | 'bybit') {
    setConnectingExchange(exchange);
    setApiKey('');
    setApiSecret('');
    setSaveError('');
  }

  async function saveConnection() {
    if (!apiKey.trim() || !apiSecret.trim()) {
      setSaveError('Both API Key and Secret are required.');
      return;
    }
    setSaving(true);
    setSaveError('');
    const res = await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exchange: connectingExchange, api_key: apiKey.trim(), api_secret: apiSecret.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json();
      setSaveError(err.error ?? 'Failed to save connection.');
      return;
    }
    setConnectingExchange(null);
    load();
  }

  async function disconnect(exchange: string) {
    if (!confirm(`Disconnect ${exchange}? Your existing trades will not be deleted.`)) return;
    await fetch('/api/connections', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exchange }),
    });
    load();
  }

  async function syncNow(exchange: string) {
    setSyncing(exchange);
    setSyncResults(prev => ({ ...prev, [exchange]: { imported: 0, message: '' } }));
    const res = await fetch(`/api/sync-trades/${exchange}`, { method: 'POST' });
    const data = await res.json();
    setSyncing(null);
    setSyncResults(prev => ({
      ...prev,
      [exchange]: {
        imported: data.imported ?? 0,
        message: res.ok
          ? (data.imported > 0 ? `${data.imported} new trade${data.imported !== 1 ? 's' : ''} imported` : 'All trades up to date')
          : (data.error ?? 'Sync failed'),
      },
    }));
    load();
  }

  function selectFormat(id: string) {
    if (id !== csvFormat) {
      setPreviewTrades(null);
      setParseError('');
      setImportResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    setCsvFormat(id);
  }

  async function handleFile(file: File | null | undefined) {
    if (!file || !csvFormat) return;
    setParseError('');
    setPreviewTrades(null);
    setImportResult(null);
    setParsing(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('format', csvFormat);
    const res = await fetch('/api/import-csv', { method: 'POST', body: fd });
    const data = await res.json();
    setParsing(false);
    if (!res.ok || data.error) {
      setParseError(data.error ?? 'Failed to parse CSV');
      return;
    }
    if (!data.trades || data.trades.length === 0) {
      const debugStr = data.debug ? ` | Headers: ${JSON.stringify(data.debug.headers ?? [])}` : '';
      setParseError((data.error ?? 'No trades found.') + debugStr);
      return;
    }
    setPreviewTrades(data.trades);
  }

  async function confirmImport() {
    if (!previewTrades) return;
    setImporting(true);
    const res = await fetch('/api/import-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trades: previewTrades }),
    });
    const data = await res.json();
    setImporting(false);
    setPreviewTrades(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setImportResult({ imported: data.imported ?? 0, skipped: data.skipped ?? 0 });
  }

  function resetCsvFlow() {
    setPreviewTrades(null);
    setParseError('');
    setImportResult(null);
    setCsvFormat(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const activeExchange = connectingExchange ? EXCHANGES.find(e => e.id === connectingExchange)! : null;

  return (
    <div className="p-8 md:p-10 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <p className="mono-label mb-2">Connections</p>
        <h1 className="text-3xl font-bold text-text tracking-tight">Connections</h1>
        <p className="text-text-muted mt-2 text-sm">
          Connect via API for live sync, or import trade history from a CSV export.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-bg-elevated rounded-xl border border-border mb-8 w-fit">
        {(['api', 'csv'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-bg-surface text-text border border-border' : 'text-text-muted hover:text-text'
            }`}
          >
            {t === 'api' ? 'API Connections' : 'CSV Import'}
          </button>
        ))}
      </div>

      {/* ── API Connections tab ── */}
      {tab === 'api' && (
        loading ? (
          <div className="p-12 text-center text-text-dim">Loading…</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {EXCHANGES.map(ex => {
              const conn = connections.find(c => c.exchange === ex.id);
              const isConnected = !!conn;
              const isSyncing = syncing === ex.id;
              const result = syncResults[ex.id];

              return (
                <div key={ex.id} className="card rounded-xl p-6 flex flex-col gap-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-lg flex items-center justify-center font-mono font-black text-bg text-sm shrink-0"
                        style={{ backgroundColor: ex.color }}
                      >
                        {ex.label}
                      </div>
                      <div>
                        <div className="font-semibold text-text">{ex.name}</div>
                        <div className={`flex items-center gap-1.5 mt-0.5 font-mono text-[10px] uppercase tracking-widest ${
                          isConnected
                            ? conn!.status === 'error' ? 'text-signal-red' : 'text-signal-green'
                            : 'text-text-dim'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                            isConnected
                              ? conn!.status === 'error' ? 'bg-signal-red' : 'bg-signal-green'
                              : 'bg-text-dim'
                          }`} />
                          {isConnected ? (conn!.status === 'error' ? 'Error' : 'Connected') : 'Not connected'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {conn?.last_synced_at && (
                    <div className="flex items-center gap-1.5 text-text-dim text-xs">
                      <Clock size={11} />
                      Last synced {timeSince(conn.last_synced_at)}
                    </div>
                  )}

                  {conn?.status === 'error' && conn.error_message && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-signal-red/10 border border-signal-red/20">
                      <AlertCircle size={13} className="text-signal-red shrink-0 mt-0.5" />
                      <span className="text-signal-red text-xs">{conn.error_message}</span>
                    </div>
                  )}

                  {result?.message && (
                    <div className={`flex items-center gap-2 text-xs ${result.imported > 0 ? 'text-signal-green' : 'text-text-muted'}`}>
                      <CheckCircle size={12} />
                      {result.message}
                    </div>
                  )}

                  <div className="flex gap-2 mt-auto">
                    {isConnected ? (
                      <>
                        <button
                          onClick={() => syncNow(ex.id)}
                          disabled={isSyncing}
                          className="btn-primary flex-1 justify-center text-sm disabled:opacity-50"
                        >
                          {isSyncing
                            ? <><Loader2 size={13} className="mr-1.5 animate-spin" /> Syncing…</>
                            : <><RefreshCw size={13} className="mr-1.5" /> Sync Now</>
                          }
                        </button>
                        <button
                          onClick={() => disconnect(ex.id)}
                          className="btn-secondary px-3"
                          title="Disconnect"
                        >
                          <Trash2 size={14} className="text-signal-red" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openConnectModal(ex.id)}
                        className="btn-secondary flex-1 justify-center text-sm"
                      >
                        <Plug size={13} className="mr-1.5" /> Connect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── CSV Import tab ── */}
      {tab === 'csv' && (
        <div>
          {/* Format cards */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {CSV_SOURCES.map(src => (
              <button
                key={src.id}
                onClick={() => selectFormat(src.id)}
                className={`card rounded-xl p-5 flex items-center gap-4 text-left transition-colors hover:border-border-strong ${
                  csvFormat === src.id ? 'border-accent/50 bg-accent/5' : ''
                }`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-black text-bg text-xs shrink-0"
                  style={{ backgroundColor: src.color }}
                >
                  {src.label}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-text text-sm">{src.name}</div>
                  <div className="text-text-dim text-xs mt-0.5">{src.hint}</div>
                </div>
                {csvFormat === src.id && (
                  <CheckCircle size={15} className="text-accent shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Upload zone */}
          {csvFormat && !previewTrades && !importResult && (
            <div className="card rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-text">
                  Upload {CSV_SOURCES.find(s => s.id === csvFormat)?.name} CSV
                </p>
                <button onClick={resetCsvFlow} className="text-text-dim hover:text-text transition-colors">
                  <X size={16} />
                </button>
              </div>

              {parsing ? (
                <div className="py-10 flex flex-col items-center gap-3">
                  <Loader2 size={24} className="animate-spin text-accent" />
                  <p className="text-sm text-text-muted">Parsing trades…</p>
                </div>
              ) : (
                <>
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setDragOver(false);
                      handleFile(e.dataTransfer.files[0]);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors select-none ${
                      dragOver
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-border-strong hover:bg-bg-elevated'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={e => handleFile(e.target.files?.[0])}
                    />
                    <Upload size={22} className="mx-auto mb-3 text-text-dim" />
                    <p className="text-sm text-text-muted">
                      Drop your CSV here or{' '}
                      <span className="text-accent">browse files</span>
                    </p>
                    <p className="text-xs text-text-dim mt-1">.csv files only</p>
                  </div>

                  {parseError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-signal-red/10 border border-signal-red/20 mt-4">
                      <AlertCircle size={13} className="text-signal-red shrink-0 mt-0.5" />
                      <span className="text-signal-red text-xs">{parseError}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Preview table */}
          {previewTrades && previewTrades.length > 0 && (
            <div className="card rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-text text-sm">
                    {previewTrades.length} trade{previewTrades.length !== 1 ? 's' : ''} ready to import
                  </p>
                  <p className="text-xs text-text-dim mt-0.5">
                    Showing first {Math.min(10, previewTrades.length)} of {previewTrades.length}
                  </p>
                </div>
                <button onClick={resetCsvFlow} className="text-text-dim hover:text-text transition-colors shrink-0">
                  <X size={16} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-elevated">
                      {['Symbol', 'Dir', 'Entry', 'Size', 'Fees', 'Date'].map(h => (
                        <th
                          key={h}
                          className={`px-4 py-2.5 text-text-dim font-mono text-[10px] uppercase tracking-wider whitespace-nowrap ${
                            ['Entry', 'Size', 'Fees'].includes(h) ? 'text-right' : 'text-left'
                          } ${h === 'Date' ? 'hidden sm:table-cell' : ''}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewTrades.slice(0, 10).map((t, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-bg-elevated/50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-text">{t.symbol}</td>
                        <td className="px-4 py-2.5">
                          <span className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            t.direction === 'long'
                              ? 'text-signal-green bg-signal-green/10'
                              : 'text-signal-red bg-signal-red/10'
                          }`}>
                            {t.direction}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-text text-right">{t.entry_price}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-text text-right">{t.position_size}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-text-muted text-right">{t.fees}</td>
                        <td className="px-4 py-2.5 text-xs text-text-muted hidden sm:table-cell whitespace-nowrap">
                          {new Date(t.opened_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewTrades.length > 10 && (
                  <div className="px-4 py-3 text-center text-text-dim text-xs border-t border-border">
                    and {previewTrades.length - 10} more…
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-border flex gap-3">
                <button onClick={resetCsvFlow} className="btn-secondary text-sm">
                  Start over
                </button>
                <button
                  onClick={confirmImport}
                  disabled={importing}
                  className="btn-primary flex-1 justify-center text-sm disabled:opacity-50"
                >
                  {importing
                    ? <><Loader2 size={13} className="mr-1.5 animate-spin" /> Importing…</>
                    : <>Import {previewTrades.length} trade{previewTrades.length !== 1 ? 's' : ''}</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className="card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle size={18} className="text-signal-green shrink-0" />
                <p className="font-semibold text-text">Import complete</p>
              </div>
              <p className="text-text-muted text-sm">
                {importResult.imported} trade{importResult.imported !== 1 ? 's' : ''} imported
                {importResult.skipped > 0 ? `, ${importResult.skipped} skipped (duplicates)` : ''}.
              </p>
              <button onClick={resetCsvFlow} className="btn-secondary text-sm mt-4">
                Import another file
              </button>
            </div>
          )}
        </div>
      )}

      {/* Connect modal */}
      {connectingExchange && activeExchange && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm flex items-start justify-center p-4 md:p-12 overflow-y-auto">
          <div className="card rounded-xl w-full max-w-lg p-8 my-8 relative">
            <button
              onClick={() => setConnectingExchange(null)}
              className="absolute top-5 right-5 text-text-dim hover:text-text transition"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-black text-bg text-xs shrink-0"
                style={{ backgroundColor: activeExchange.color }}
              >
                {activeExchange.label}
              </div>
              <div>
                <p className="mono-label">Connect Exchange</p>
                <h2 className="font-bold text-xl text-text tracking-tight">{activeExchange.name}</h2>
              </div>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-bg-elevated border border-border">
              <p className="font-mono text-[10px] uppercase tracking-widest text-text-dim mb-3">Setup Instructions</p>
              <ol className="space-y-2">
                {activeExchange.instructions.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-text-muted">
                    <span className="font-mono text-accent shrink-0">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="mono-label mb-2 block">API Key</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="form-input font-mono text-sm"
                  placeholder="Paste your API key here"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="mono-label mb-2 block">API Secret</label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={e => setApiSecret(e.target.value)}
                  className="form-input font-mono text-sm"
                  placeholder="Paste your API secret here"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {saveError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-signal-red/10 border border-signal-red/20 mb-4">
                <AlertCircle size={14} className="text-signal-red shrink-0 mt-0.5" />
                <span className="text-signal-red text-sm">{saveError}</span>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/5 border border-accent/20 mb-5">
              <span className="text-accent text-lg leading-none shrink-0">🔒</span>
              <p className="text-accent text-xs leading-relaxed">
                We only request <strong>read access</strong>. We cannot place trades, withdraw funds, or transfer assets from your account.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setConnectingExchange(null)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
              <button onClick={saveConnection} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'Connect Exchange'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
