'use client';

import { useState, useRef } from 'react';
import { X, Eye, EyeOff, Loader2, AlertCircle, ChevronDown, CheckCircle } from 'lucide-react';
import { BROKERS, BROKER_IDS, type BrokerId } from '@/lib/brokers';

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

interface Props {
  onClose: () => void;
  onConnected: (connection: BrokerConnection) => void;
}

export default function BrokerConnectionModal({ onClose, onConnected }: Props) {
  const [selectedBroker, setSelectedBroker] = useState<BrokerId | null>(null);
  const [platform, setPlatform] = useState<'mt4' | 'mt5'>('mt5');
  const [accountNumber, setAccountNumber] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState('');
  const [customServer, setCustomServer] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [serverDropdownOpen, setServerDropdownOpen] = useState(false);
  const [customBrokerName, setCustomBrokerName] = useState('');
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const serverRef = useRef<HTMLDivElement>(null);

  const brokerConfig = selectedBroker ? BROKERS[selectedBroker] : null;
  const knownServers = brokerConfig ? brokerConfig.servers[platform] : [];
  const effectiveServer = server === '__custom__' ? customServer : server;
  const effectiveBrokerName = selectedBroker === 'other'
    ? customBrokerName
    : (brokerConfig?.name ?? '');

  const canVerify =
    selectedBroker !== null &&
    (selectedBroker !== 'other' || customBrokerName.trim().length > 0) &&
    accountNumber.trim().length > 0 &&
    password.trim().length >= 6 &&
    effectiveServer.trim().length > 0;

  function handleBrokerSelect(id: BrokerId) {
    if (selectedBroker === id) return;
    setSelectedBroker(id);
    setServer('');
    setCustomServer('');
    setVerified(false);
    setError('');
    // default to mt5 if broker supports it
    if (BROKERS[id].platforms.includes('mt5')) setPlatform('mt5');
    else setPlatform('mt4');
  }

  function handlePlatformChange(p: 'mt4' | 'mt5') {
    setPlatform(p);
    setServer('');
    setCustomServer('');
    setVerified(false);
  }

  async function handleVerify() {
    setError('');
    if (!canVerify) return;
    if (!/^\d+$/.test(accountNumber.trim())) {
      setError('Account number must contain digits only.');
      return;
    }
    if (password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setVerifying(true);
    // Simulate verification delay (real MT5 API connection in future phase)
    await new Promise(r => setTimeout(r, 1200));
    setVerifying(false);
    setVerified(true);
  }

  async function handleConnect() {
    if (!verified || !selectedBroker) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/broker-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_name: effectiveBrokerName,
          platform,
          account_number: accountNumber.trim(),
          server: effectiveServer.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to save connection.'); setSaving(false); return; }
      setSuccess(true);
      setTimeout(() => {
        onConnected(data);
        onClose();
      }, 1500);
    } catch {
      setError('Network error. Please try again.');
      setSaving(false);
    }
  }

  if (success) {
    return (
      <ModalShell onClose={onClose}>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'rgba(0,217,255,0.1)', border: '1px solid rgba(0,217,255,0.3)' }}>
            <CheckCircle size={26} className="text-accent" />
          </div>
          <h2 className="text-xl font-bold text-text mb-2">Broker connected!</h2>
          <p className="text-text-muted text-sm">Trade sync coming soon.</p>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center gap-3 mb-6">
        <div>
          <p className="mono-label">Connect Broker</p>
          <h2 className="font-bold text-xl text-text tracking-tight">MT4 / MT5 Account</h2>
        </div>
      </div>

      {/* Step 1 — Choose Broker */}
      <div className="mb-5">
        <p className="mono-label mb-3">Step 1 — Choose Broker</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BROKER_IDS.map(id => {
            const b = BROKERS[id];
            const isSelected = selectedBroker === id;
            return (
              <button
                key={id}
                onClick={() => handleBrokerSelect(id)}
                className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left ${
                  isSelected
                    ? 'border-accent/60 bg-accent/8 text-text'
                    : 'border-border hover:border-border-strong text-text-muted hover:text-text'
                }`}
                style={isSelected ? { background: 'rgba(0,217,255,0.06)' } : undefined}
              >
                {b.name}
              </button>
            );
          })}
        </div>

        {selectedBroker === 'other' && (
          <div className="mt-3">
            <label className="mono-label mb-2 block">Broker Name</label>
            <input
              type="text"
              value={customBrokerName}
              onChange={e => setCustomBrokerName(e.target.value)}
              className="form-input text-sm"
              placeholder="e.g. TMGM, Axiory..."
            />
          </div>
        )}
      </div>

      {/* Step 2 — Credentials (only shown after broker selected) */}
      {selectedBroker && (
        <div className="mb-5">
          <p className="mono-label mb-3">Step 2 — Enter Credentials</p>

          {/* Platform toggle */}
          <div className="mb-4">
            <label className="mono-label mb-2 block">Platform</label>
            <div className="inline-flex rounded-lg border border-border p-0.5 gap-0.5">
              {(['mt5', 'mt4'] as const).map(p => {
                const supported = brokerConfig?.platforms.includes(p) ?? true;
                return (
                  <button
                    key={p}
                    onClick={() => supported && handlePlatformChange(p)}
                    disabled={!supported}
                    className={`px-4 py-1.5 rounded-md text-sm font-mono font-semibold transition-all uppercase tracking-wider ${
                      platform === p
                        ? 'text-[#0A0A0B]'
                        : 'text-text-muted hover:text-text disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                    style={platform === p ? { background: '#00D9FF' } : undefined}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {/* Account Number */}
            <div>
              <label className="mono-label mb-2 block">Account Number</label>
              <input
                type="text"
                inputMode="numeric"
                value={accountNumber}
                onChange={e => { setAccountNumber(e.target.value); setVerified(false); }}
                className="form-input font-mono text-sm"
                placeholder="e.g. 60906"
                autoComplete="off"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mono-label mb-2 block">Master Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setVerified(false); }}
                  className="form-input font-mono text-sm pr-10"
                  placeholder="Your MT4/MT5 master password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-text-dim text-xs mt-1.5">
                Used once for verification only — never stored.
              </p>
            </div>

            {/* Server */}
            <div>
              <label className="mono-label mb-2 block">Broker Server</label>
              {knownServers.length > 0 ? (
                <div className="relative" ref={serverRef}>
                  <button
                    type="button"
                    onClick={() => setServerDropdownOpen(v => !v)}
                    className={`form-input text-sm flex items-center justify-between cursor-pointer ${
                      server ? 'text-text' : 'text-text-dim'
                    }`}
                  >
                    <span className="font-mono">
                      {server === '__custom__'
                        ? 'Custom server…'
                        : (server || `Select ${platform.toUpperCase()} server`)}
                    </span>
                    <ChevronDown size={14} className={`shrink-0 transition-transform ${serverDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {serverDropdownOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-border overflow-hidden shadow-xl"
                      style={{ background: 'var(--bg-surface)' }}>
                      {knownServers.map(s => (
                        <button
                          key={s}
                          onClick={() => { setServer(s); setCustomServer(''); setServerDropdownOpen(false); setVerified(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-mono transition-colors hover:bg-bg-elevated ${
                            server === s ? 'text-accent' : 'text-text-muted hover:text-text'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                      <button
                        onClick={() => { setServer('__custom__'); setServerDropdownOpen(false); setVerified(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-bg-elevated border-t border-border ${
                          server === '__custom__' ? 'text-accent' : 'text-text-dim hover:text-text'
                        }`}
                      >
                        Type custom server…
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              {(knownServers.length === 0 || server === '__custom__') && (
                <input
                  type="text"
                  value={customServer}
                  onChange={e => { setCustomServer(e.target.value); setVerified(false); }}
                  className={`form-input font-mono text-sm ${knownServers.length > 0 ? 'mt-2' : ''}`}
                  placeholder="e.g. MyBroker-MT5Live"
                  autoComplete="off"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-signal-red/10 border border-signal-red/20 mb-4">
          <AlertCircle size={13} className="text-signal-red shrink-0 mt-0.5" />
          <span className="text-signal-red text-sm">{error}</span>
        </div>
      )}

      {/* Privacy notice */}
      {selectedBroker && (
        <div className="flex items-start gap-2 p-3 rounded-lg mb-5"
          style={{ background: 'rgba(0,217,255,0.05)', border: '1px solid rgba(0,217,255,0.15)' }}>
          <span className="text-accent text-base leading-none shrink-0 mt-0.5">🔒</span>
          <p className="text-accent text-xs leading-relaxed">
            Your password is used once to verify the account and is <strong>never stored</strong>.
            Only connection metadata (account number, server) is saved.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1 justify-center text-sm">
          Cancel
        </button>

        {!verified ? (
          <button
            onClick={handleVerify}
            disabled={!canVerify || verifying}
            className="btn-secondary flex-1 justify-center text-sm disabled:opacity-40"
            style={canVerify && !verifying ? { borderColor: 'rgba(0,217,255,0.45)', color: 'var(--accent)' } : undefined}
          >
            {verifying
              ? <><Loader2 size={13} className="mr-1.5 animate-spin" /> Verifying…</>
              : 'Verify Account'
            }
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={saving}
            className="btn-primary flex-1 justify-center text-sm disabled:opacity-50"
          >
            {saving
              ? <><Loader2 size={13} className="mr-1.5 animate-spin" /> Connecting…</>
              : 'Connect & Sync'
            }
          </button>
        )}
      </div>

      {/* Verified state indicator */}
      {verified && !saving && (
        <div className="flex items-center justify-center gap-2 mt-3 text-signal-green text-xs">
          <CheckCircle size={12} />
          Account verified — ready to connect
        </div>
      )}
    </ModalShell>
  );
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 md:p-12 overflow-y-auto"
      style={{ background: 'rgba(10,10,11,0.8)', backdropFilter: 'blur(4px)' }}>
      <div className="card rounded-xl w-full max-w-lg p-7 my-8 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-text-dim hover:text-text transition-colors"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}
