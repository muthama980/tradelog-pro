'use client';

import { Loader2, Trash2, Clock, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';

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
  connections: BrokerConnection[];
  disconnecting: string | null;
  onDisconnect: (id: string, brokerName: string) => void;
}

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function maskAccount(account: string): string {
  if (account.length <= 3) return '***';
  return '****' + account.slice(-3);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; Icon: typeof CheckCircle }> = {
    connected: { label: 'Connected', color: '#22C55E', bg: 'rgba(34,197,94,0.1)', Icon: CheckCircle },
    pending:   { label: 'Pending',   color: '#A1A1AA', bg: 'rgba(161,161,170,0.1)', Icon: Clock },
    verified:  { label: 'Verified',  color: '#00D9FF', bg: 'rgba(0,217,255,0.1)', Icon: Wifi },
    failed:    { label: 'Failed',    color: '#EF4444', bg: 'rgba(239,68,68,0.1)', Icon: AlertCircle },
    disconnected: { label: 'Disconnected', color: '#71717A', bg: 'rgba(113,113,122,0.1)', Icon: WifiOff },
  };
  const cfg = map[status] ?? map.pending;
  const { label, color, bg, Icon } = cfg;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wide"
      style={{ color, background: bg }}>
      <Icon size={10} />
      {label}
    </span>
  );
}

export default function ConnectedBrokers({ connections, disconnecting, onDisconnect }: Props) {
  if (connections.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="mono-label mb-3">Connected Brokers</p>
      <div className="space-y-3">
        {connections.map(conn => (
          <div key={conn.id} className="card rounded-xl p-4 flex items-center gap-4">
            {/* Broker icon */}
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-mono font-black text-[10px] uppercase"
              style={{ background: 'rgba(0,217,255,0.1)', border: '1px solid rgba(0,217,255,0.2)', color: '#00D9FF' }}>
              {conn.broker_name.slice(0, 2)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-text text-sm">{conn.broker_name}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border text-text-dim"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                  {conn.platform}
                </span>
                <StatusBadge status={conn.status} />
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="font-mono text-xs text-text-muted">{maskAccount(conn.account_number)}</span>
                <span className="text-text-dim text-xs hidden sm:inline">{conn.server}</span>
                {conn.last_synced_at && (
                  <span className="flex items-center gap-1 text-text-dim text-xs">
                    <Clock size={10} /> {timeSince(conn.last_synced_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Disconnect */}
            <button
              onClick={() => onDisconnect(conn.id, conn.broker_name)}
              disabled={disconnecting === conn.id}
              className="btn-secondary px-3 shrink-0 disabled:opacity-50"
              title="Disconnect broker"
            >
              {disconnecting === conn.id
                ? <Loader2 size={14} className="animate-spin text-text-dim" />
                : <Trash2 size={14} className="text-signal-red" />
              }
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
