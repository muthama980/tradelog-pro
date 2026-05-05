'use client';

import { useEffect, useState } from 'react';
import { Plug, RefreshCw, Trash2, X, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';

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
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingExchange, setConnectingExchange] = useState<'binance' | 'bybit' | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});

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

  const connectedExchanges = new Set(connections.map(c => c.exchange));

  const activeExchange = connectingExchange ? EXCHANGES.find(e => e.id === connectingExchange)! : null;

  return (
    <div className="p-8 md:p-10 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <p className="mono-label mb-2">Exchanges</p>
        <h1 className="text-3xl font-bold text-text tracking-tight">Connected Exchanges</h1>
        <p className="text-text-muted mt-2 text-sm">
          Connect your exchange accounts to automatically sync your trade history.
        </p>
      </div>

      {/* Exchange cards */}
      {loading ? (
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
                {/* Logo + name + status */}
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

                {/* Last synced */}
                {conn?.last_synced_at && (
                  <div className="flex items-center gap-1.5 text-text-dim text-xs">
                    <Clock size={11} />
                    Last synced {timeSince(conn.last_synced_at)}
                  </div>
                )}

                {/* Error message */}
                {conn?.status === 'error' && conn.error_message && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-signal-red/10 border border-signal-red/20">
                    <AlertCircle size={13} className="text-signal-red shrink-0 mt-0.5" />
                    <span className="text-signal-red text-xs">{conn.error_message}</span>
                  </div>
                )}

                {/* Sync result */}
                {result?.message && (
                  <div className={`flex items-center gap-2 text-xs ${result.imported > 0 ? 'text-signal-green' : 'text-text-muted'}`}>
                    <CheckCircle size={12} />
                    {result.message}
                  </div>
                )}

                {/* Actions */}
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

            {/* Modal header */}
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

            {/* Instructions */}
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

            {/* Inputs */}
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

            {/* Security note */}
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
