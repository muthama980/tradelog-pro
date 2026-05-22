'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Plug, RefreshCw, Trash2, X, Loader2, CheckCircle, AlertCircle,
  Clock, Upload, Bell, ChevronRight, FileText, Zap, Info, Cable,
} from 'lucide-react';
import BrokerConnectionModal from '@/components/dashboard/BrokerConnectionModal';
import ConnectedBrokers from '@/components/dashboard/ConnectedBrokers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Connection {
  id: string;
  exchange: string;
  status: 'active' | 'error' | 'disconnected';
  last_synced_at: string | null;
  error_message: string | null;
}

interface SyncResult { imported: number; message: string; }

interface CsvTrade {
  symbol: string; market: string; direction: 'long' | 'short';
  entry_price: number; exit_price: number | null; position_size: number;
  fees: number; pnl: number | null; opened_at: string;
  closed_at: string | null; status: 'open' | 'closed';
}

type ExchangeId = 'binance' | 'coinbase' | 'kraken' | 'okx';

interface BrokerConnection {
  id: string;
  broker_name: string;
  platform: string;
  account_number: string;
  server: string;
  status: string;
  last_synced_at: string | null;
  created_at: string;
}

type Method =
  | { kind: 'api'; exchange: ExchangeId; name: string; hint: string }
  | { kind: 'csv'; format: string; name: string; hint: string }
  | { kind: 'broker'; name: string; hint: string }
  | { kind: 'coming-soon'; name: string; hint: string }
  | { kind: 'manual'; name: string; hint: string };

// ─── Exchange metadata ────────────────────────────────────────────────────────

const EXCHANGE_META: Record<ExchangeId, {
  name: string; color: string; logoText: string; logoTextColor: string;
  hasPassphrase?: boolean; instructions: string[];
}> = {
  binance: {
    name: 'Binance', color: '#F0B90B', logoText: 'B', logoTextColor: '#000',
    instructions: [
      'Go to Binance → Account → API Management',
      'Click "Create API" → select "System generated"',
      'Label it "TradeLog Pro"',
      'Enable ONLY "Enable Reading" permission',
      'Do NOT enable Spot, Margin, Futures Trading or Withdrawals',
      'Copy the API Key and Secret Key',
    ],
  },
  coinbase: {
    name: 'Coinbase', color: '#0052FF', logoText: 'CB', logoTextColor: '#fff',
    instructions: [
      'Go to Coinbase Advanced Trade → Settings → API',
      'Click "New API Key"',
      'Enable ONLY "View" permissions',
      'Do NOT enable any Trade or Transfer permissions',
      'Copy the API Key and API Secret',
    ],
  },
  kraken: {
    name: 'Kraken', color: '#5741D9', logoText: 'K', logoTextColor: '#fff',
    instructions: [
      'Go to Kraken → Security → API',
      'Click "Add key"',
      'Enable: Query Funds, Query Open Orders & Trades, Query Closed Orders & Trades',
      'Do NOT enable any trading or withdrawal permissions',
      'Copy the API Key and Private Key',
    ],
  },
  okx: {
    name: 'OKX', color: '#1A1A1A', logoText: 'OKX', logoTextColor: '#fff',
    hasPassphrase: true,
    instructions: [
      'Go to OKX → Account → API Management',
      'Click "Create API key"',
      'Select "Read only" permissions',
      'Create a passphrase — you will need it below',
      'Do NOT enable any trading permissions',
      'Copy the API Key, Secret Key, and Passphrase',
    ],
  },
};

// ─── Market data ──────────────────────────────────────────────────────────────

const MARKETS: {
  id: string; name: string; description: string; symbol: string;
  note?: string; methods: Method[];
}[] = [
  {
    id: 'crypto', name: 'Crypto', description: 'BTC, ETH, altcoins, futures', symbol: '₿',
    methods: [
      { kind: 'api', exchange: 'binance',  name: 'Binance API',  hint: 'Auto-sync spot & futures trades' },
      { kind: 'api', exchange: 'coinbase', name: 'Coinbase API', hint: 'Auto-sync spot trades' },
      { kind: 'api', exchange: 'kraken',   name: 'Kraken API',   hint: 'Auto-sync spot & futures trades' },
      { kind: 'api', exchange: 'okx',      name: 'OKX API',      hint: 'Auto-sync spot & perpetual trades' },
      { kind: 'csv', format: 'binance', name: 'CSV Import', hint: 'Upload trade history from any exchange' },
    ],
  },
  {
    id: 'forex', name: 'Forex', description: 'Currency pairs', symbol: 'FX',
    methods: [
      { kind: 'broker', name: 'MT4 / MT5 Broker', hint: 'Connect Exness, XM, Vantage, IC Markets & more' },
      { kind: 'csv', format: 'metatrader', name: 'MetaTrader 4/5 CSV', hint: 'Import MT4 or MT5 trade statements' },
      { kind: 'manual', name: 'Manual Entry',          hint: 'Log trades in your journal' },
    ],
  },
  {
    id: 'stocks', name: 'Stocks', description: 'Equities, indices', symbol: '↗',
    note: 'Stock brokers primarily support CSV import. Upload your trade history to get started.',
    methods: [
      { kind: 'broker', name: 'MT5 Broker', hint: 'Connect stocks/indices broker via MT5 account' },
      { kind: 'manual', name: 'Manual Entry',                   hint: 'Log trades in your journal' },
    ],
  },
  {
    id: 'futures', name: 'Futures', description: 'Commodities, indices', symbol: '◈',
    methods: [
      { kind: 'broker', name: 'MT4 / MT5 Broker', hint: 'Connect futures broker via MT4/MT5 account' },
      { kind: 'csv', format: 'metatrader', name: 'MetaTrader CSV', hint: 'Import futures trade statements' },
      { kind: 'manual', name: 'Manual Entry',         hint: 'Log trades in your journal' },
    ],
  },
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConnectionsPage() {
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [notifyToast, setNotifyToast] = useState(false);

  // Connections
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  // Connect modal
  const [connectingExchange, setConnectingExchange] = useState<ExchangeId | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [apiPassphrase, setApiPassphrase] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Broker connections
  const [brokerConnections, setBrokerConnections] = useState<BrokerConnection[]>([]);
  const [brokerModalOpen, setBrokerModalOpen] = useState(false);
  const [disconnectingBroker, setDisconnectingBroker] = useState<string | null>(null);

  // Sync
  const [syncingExchange, setSyncingExchange] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});

  // CSV
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
    const [connRes, brokerRes] = await Promise.all([
      fetch('/api/connections'),
      fetch('/api/broker-connections'),
    ]);
    if (connRes.ok) setConnections(await connRes.json());
    if (brokerRes.ok) setBrokerConnections(await brokerRes.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function disconnectBroker(id: string, brokerName: string) {
    if (!confirm(`Disconnect ${brokerName}? Your existing trades will not be deleted.`)) return;
    setDisconnectingBroker(id);
    await fetch('/api/broker-connections', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setDisconnectingBroker(null);
    setBrokerConnections(prev => prev.filter(c => c.id !== id));
  }

  // ── Connect modal ────────────────────────────────────────────────────────────

  function openConnectModal(exchange: ExchangeId) {
    setApiKey(''); setApiSecret(''); setApiPassphrase(''); setSaveError('');
    setConnectingExchange(exchange);
  }

  async function saveConnection() {
    if (!connectingExchange) return;
    const meta = EXCHANGE_META[connectingExchange];
    if (!apiKey.trim() || !apiSecret.trim()) { setSaveError('API Key and Secret are required.'); return; }
    if (meta.hasPassphrase && !apiPassphrase.trim()) { setSaveError('Passphrase is required for OKX.'); return; }
    setSaving(true); setSaveError('');
    const body: Record<string, string> = {
      exchange: connectingExchange,
      api_key: apiKey.trim(),
      api_secret: apiSecret.trim(),
    };
    if (meta.hasPassphrase) body.api_passphrase = apiPassphrase.trim();
    const res = await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) { const err = await res.json(); setSaveError(err.error ?? 'Failed to save.'); return; }
    setConnectingExchange(null);
    load();
  }

  // ── Disconnect ───────────────────────────────────────────────────────────────

  async function disconnect(exchange: ExchangeId) {
    const meta = EXCHANGE_META[exchange];
    if (!confirm(`Disconnect ${meta.name}? Your existing trades will not be deleted.`)) return;
    await fetch('/api/connections', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exchange }),
    });
    load();
  }

  // ── Sync ─────────────────────────────────────────────────────────────────────

  async function syncNow(exchange: ExchangeId) {
    setSyncingExchange(exchange);
    const res = await fetch(`/api/sync-trades/${exchange}`, { method: 'POST' });
    const data = await res.json();
    setSyncingExchange(null);
    setSyncResults(prev => ({
      ...prev,
      [exchange]: {
        imported: data.imported ?? 0,
        message: res.ok
          ? (data.imported > 0
            ? `${data.imported} new trade${data.imported !== 1 ? 's' : ''} imported`
            : 'All trades up to date')
          : (data.error ?? 'Sync failed'),
      },
    }));
    load();
  }

  // ── CSV ──────────────────────────────────────────────────────────────────────

  function selectCsvFormat(format: string) {
    if (csvFormat === format) { setCsvFormat(null); return; }
    setCsvFormat(format);
    setPreviewTrades(null); setParseError(''); setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleFile(file: File | null | undefined) {
    if (!file || !csvFormat) return;
    setParseError(''); setPreviewTrades(null); setImportResult(null); setParsing(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('format', csvFormat);
    const res = await fetch('/api/import-csv', { method: 'POST', body: fd });
    const data = await res.json();
    setParsing(false);
    if (!res.ok) { setParseError(data.error ?? 'Failed to parse CSV'); return; }
    if (!data.trades || data.trades.length === 0) {
      const dbg = data.debug ? ` | Headers: ${JSON.stringify(data.debug.headers ?? [])}` : '';
      setParseError((data.error ?? 'No trades found.') + dbg);
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
    setCsvFormat(null); setPreviewTrades(null); setParseError(''); setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function showNotify() {
    setNotifyToast(true);
    setTimeout(() => setNotifyToast(false), 3000);
  }

  const currentMarket = MARKETS.find(m => m.id === selectedMarket);

  // ─── Render exchange API card ─────────────────────────────────────────────

  function renderApiCard(exchange: ExchangeId, name: string, hint: string, i: number) {
    const meta = EXCHANGE_META[exchange];
    const conn = connections.find(c => c.exchange === exchange);
    const isConnected = !!conn;
    const isLive = conn?.status !== 'error';
    const syncing = syncingExchange === exchange;
    const result = syncResults[exchange];

    return (
      <div key={i} className="card rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0"
            style={{ backgroundColor: meta.color, color: meta.logoTextColor }}
          >
            {meta.logoText}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text text-sm">{name}</div>
            <div className="text-text-muted text-xs mt-0.5">{hint}</div>
          </div>
          {!loading && (
            <span className={`flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest shrink-0 ${
              isConnected ? (isLive ? 'text-signal-green' : 'text-signal-red') : 'text-text-dim'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? (isLive ? 'bg-signal-green' : 'bg-signal-red') : 'bg-text-dim'
              }`} />
              {isConnected ? (isLive ? 'Live' : 'Error') : 'Off'}
            </span>
          )}
        </div>

        {conn?.last_synced_at && (
          <div className="flex items-center gap-1.5 text-text-muted text-xs">
            <Clock size={11} /> Last synced {timeSince(conn.last_synced_at)}
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
            <CheckCircle size={12} /> {result.message}
          </div>
        )}

        <div className="flex gap-2 mt-auto">
          {isConnected ? (
            <>
              <button
                onClick={() => syncNow(exchange)}
                disabled={syncing}
                className="btn-primary flex-1 justify-center text-sm disabled:opacity-50"
              >
                {syncing
                  ? <><Loader2 size={13} className="mr-1.5 animate-spin" /> Syncing…</>
                  : <><RefreshCw size={13} className="mr-1.5" /> Sync Now</>
                }
              </button>
              <button onClick={() => disconnect(exchange)} className="btn-secondary px-3" title="Disconnect">
                <Trash2 size={14} className="text-signal-red" />
              </button>
            </>
          ) : (
            <button onClick={() => openConnectModal(exchange)} className="btn-secondary flex-1 justify-center text-sm">
              <Plug size={13} className="mr-1.5" /> Connect
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Render method card ───────────────────────────────────────────────────

  function renderMethod(method: Method, i: number) {
    if (method.kind === 'api') {
      return renderApiCard(method.exchange, method.name, method.hint, i);
    }

    if (method.kind === 'broker') {
      return (
        <button
          key={i}
          onClick={() => setBrokerModalOpen(true)}
          className="card rounded-xl p-5 flex items-center gap-4 text-left transition-colors hover:border-border-strong"
          style={{ borderColor: 'rgba(0,217,255,0.25)', background: 'rgba(0,217,255,0.03)' }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(0,217,255,0.1)', border: '1px solid rgba(0,217,255,0.25)' }}>
            <Cable size={16} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-text text-sm">{method.name}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest bg-bg-elevated text-text-dim border border-border">
                Soon
              </span>
            </div>
            <div className="text-text-muted text-xs mt-0.5">{method.hint}</div>
          </div>
          <ChevronRight size={15} className="text-accent shrink-0" />
        </button>
      );
    }

    if (method.kind === 'csv') {
      const isSelected = csvFormat === method.format;
      return (
        <button
          key={i}
          onClick={() => selectCsvFormat(method.format)}
          className={`card rounded-xl p-5 flex items-center gap-4 text-left transition-colors hover:border-border-strong ${
            isSelected ? 'border-accent/50 bg-accent/5' : ''
          }`}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-bg-elevated border border-border shrink-0">
            <Upload size={16} className="text-text-muted" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text text-sm">{method.name}</div>
            <div className="text-text-muted text-xs mt-0.5">{method.hint}</div>
          </div>
          {isSelected
            ? <CheckCircle size={15} className="text-accent shrink-0" />
            : <ChevronRight size={15} className="text-text-muted shrink-0" />
          }
        </button>
      );
    }

    if (method.kind === 'coming-soon') {
      return (
        <div key={i} className="card rounded-xl p-5 flex items-center gap-4 opacity-70">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-bg-elevated border border-border shrink-0">
            <Zap size={16} className="text-text-dim" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-text text-sm">{method.name}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest bg-bg-elevated text-text-dim border border-border">
                Soon
              </span>
            </div>
            <div className="text-text-muted text-xs mt-0.5">{method.hint}</div>
          </div>
          <button
            onClick={showNotify}
            className="shrink-0 p-2 rounded-lg border border-border hover:border-border-strong hover:bg-bg-elevated transition-colors"
            title="Notify me"
          >
            <Bell size={14} className="text-text-muted" />
          </button>
        </div>
      );
    }

    if (method.kind === 'manual') {
      return (
        <Link
          key={i}
          href="/dashboard/journal"
          className="card rounded-xl p-5 flex items-center gap-4 hover:border-border-strong transition-colors"
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-bg-elevated border border-border shrink-0">
            <FileText size={16} className="text-text-muted" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text text-sm">{method.name}</div>
            <div className="text-text-muted text-xs mt-0.5">{method.hint}</div>
          </div>
          <ChevronRight size={15} className="text-text-muted shrink-0" />
        </Link>
      );
    }

    return null;
  }

  const modalMeta = connectingExchange ? EXCHANGE_META[connectingExchange] : null;

  return (
    <div className="p-8 md:p-10 max-w-4xl">

      {/* Header */}
      <div className="mb-8">
        <p className="mono-label mb-2">Connections</p>
        <h1 className="text-3xl font-bold text-text tracking-tight">Connect Your Broker</h1>
        <p className="text-text-muted mt-2 text-sm">
          Choose your market type to see available connection methods.
        </p>
      </div>

      {/* Market category cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {MARKETS.map(market => (
          <button
            key={market.id}
            onClick={() => {
              setSelectedMarket(prev => prev === market.id ? null : market.id);
              resetCsvFlow();
            }}
            className={`card rounded-xl p-5 text-left transition-all hover:border-border-strong ${
              selectedMarket === market.id ? 'border-accent/60 bg-accent/5' : ''
            }`}
          >
            <div className="text-xl font-mono font-black text-accent mb-3">{market.symbol}</div>
            <div className="font-semibold text-text text-sm">{market.name}</div>
            <div className="text-text-muted text-xs mt-0.5">{market.description}</div>
            {selectedMarket === market.id && (
              <div className="mt-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-accent">Selected ↓</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Methods panel */}
      {currentMarket && (
        <div>
          <p className="mono-label mb-4">{currentMarket.name} — Connection Methods</p>

          {/* Note banner for non-crypto markets */}
          {currentMarket.note && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-bg-elevated border border-border mb-4">
              <Info size={15} className="text-text-muted shrink-0 mt-0.5" />
              <p className="text-text-muted text-sm">{currentMarket.note}</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {currentMarket.methods.map((method, i) => renderMethod(method, i))}
          </div>

          {/* CSV upload zone */}
          {csvFormat && !previewTrades && !importResult && (
            <div className="card rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-text">Upload CSV</p>
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
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors select-none ${
                      dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-border-strong hover:bg-bg-elevated'
                    }`}
                  >
                    <input
                      ref={fileInputRef} type="file" accept=".csv,.txt"
                      className="hidden"
                      onChange={e => handleFile(e.target.files?.[0])}
                    />
                    <Upload size={22} className="mx-auto mb-3 text-text-dim" />
                    <p className="text-sm text-text-muted">
                      Drop your CSV here or <span className="text-accent">browse files</span>
                    </p>
                    <p className="text-xs text-text-muted mt-1">.csv files only</p>
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
                  <p className="text-xs text-text-muted mt-0.5">
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
                        <th key={h} className={`px-4 py-2.5 text-text-muted font-mono text-xs uppercase tracking-wider whitespace-nowrap ${
                          ['Entry', 'Size', 'Fees'].includes(h) ? 'text-right' : 'text-left'
                        } ${h === 'Date' ? 'hidden sm:table-cell' : ''}`}>
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
                            t.direction === 'long' ? 'text-signal-green bg-signal-green/10' : 'text-signal-red bg-signal-red/10'
                          }`}>{t.direction}</span>
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
                  <div className="px-4 py-3 text-center text-text-muted text-xs border-t border-border">
                    and {previewTrades.length - 10} more…
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-border flex gap-3">
                <button onClick={resetCsvFlow} className="btn-secondary text-sm">Start over</button>
                <button
                  onClick={confirmImport} disabled={importing}
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

          {/* Connected brokers list */}
          {['forex', 'stocks', 'futures'].includes(currentMarket.id) && (
            <ConnectedBrokers
              connections={brokerConnections}
              disconnecting={disconnectingBroker}
              onDisconnect={disconnectBroker}
            />
          )}
        </div>
      )}

      {/* Notify toast */}
      {notifyToast && (
        <div className="fixed bottom-6 right-6 z-50 card rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg">
          <Bell size={14} className="text-accent shrink-0" />
          <p className="text-sm text-text">We&apos;ll let you know when this is ready.</p>
          <button onClick={() => setNotifyToast(false)} className="text-text-dim hover:text-text transition-colors ml-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Broker connection modal */}
      {brokerModalOpen && (
        <BrokerConnectionModal
          onClose={() => setBrokerModalOpen(false)}
          onConnected={conn => {
            setBrokerConnections(prev => [conn, ...prev]);
            setBrokerModalOpen(false);
          }}
        />
      )}

      {/* Connect modal */}
      {connectingExchange && modalMeta && (
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
                className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0"
                style={{ backgroundColor: modalMeta.color, color: modalMeta.logoTextColor }}
              >
                {modalMeta.logoText}
              </div>
              <div>
                <p className="mono-label">Connect Exchange</p>
                <h2 className="font-bold text-xl text-text tracking-tight">{modalMeta.name}</h2>
              </div>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-bg-elevated border border-border">
              <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted mb-3">Setup Instructions</p>
              <ol className="space-y-2">
                {modalMeta.instructions.map((step, i) => (
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
                  type="text" value={apiKey} onChange={e => setApiKey(e.target.value)}
                  className="form-input font-mono text-sm"
                  placeholder="Paste your API key here"
                  autoComplete="off" spellCheck={false}
                />
              </div>
              <div>
                <label className="mono-label mb-2 block">
                  {connectingExchange === 'kraken' ? 'Private Key' : 'Secret Key'}
                </label>
                <input
                  type="password" value={apiSecret} onChange={e => setApiSecret(e.target.value)}
                  className="form-input font-mono text-sm"
                  placeholder={connectingExchange === 'kraken' ? 'Paste your private key' : 'Paste your secret key'}
                  autoComplete="new-password"
                />
              </div>
              {modalMeta.hasPassphrase && (
                <div>
                  <label className="mono-label mb-2 block">Passphrase</label>
                  <input
                    type="password" value={apiPassphrase} onChange={e => setApiPassphrase(e.target.value)}
                    className="form-input font-mono text-sm"
                    placeholder="Paste your API passphrase"
                    autoComplete="new-password"
                  />
                </div>
              )}
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
