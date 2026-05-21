'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Shield, Send, Users, User, Search, X, Loader2,
  CheckCircle, Info, AlertTriangle, Bell, Sparkles, Mail, Clock,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type RecipientMode = 'all' | 'specific';
type NotifType     = 'info' | 'success' | 'warning' | 'alert' | 'feature';

interface Profile { id: string; email: string; full_name: string | null; }

interface LogEntry {
  id: string;
  title: string;
  message: string;
  type: NotifType;
  link: string | null;
  to_all: boolean;
  recipient_count: number;
  sent_email: boolean;
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPES: { value: NotifType; label: string }[] = [
  { value: 'info',    label: 'Info'    },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'alert',   label: 'Alert'   },
  { value: 'feature', label: 'Feature' },
];

const TYPE_BADGE: Record<NotifType, string> = {
  info:    'border-accent/30    bg-accent/10    text-accent',
  success: 'border-signal-green/30 bg-signal-green/10 text-signal-green',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-400',
  alert:   'border-signal-red/30  bg-signal-red/10  text-signal-red',
  feature: 'border-purple-400/30 bg-purple-400/10 text-purple-400',
};

const TYPE_ICON: Record<NotifType, React.ElementType> = {
  info:    Info,
  success: CheckCircle,
  warning: AlertTriangle,
  alert:   Bell,
  feature: Sparkles,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminNotificationsPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [checking,  setChecking]  = useState(true);
  const [mode,      setMode]      = useState<RecipientMode>('all');
  const [searchQ,   setSearchQ]   = useState('');
  const [results,   setResults]   = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected,  setSelected]  = useState<Profile | null>(null);
  const [showDrop,  setShowDrop]  = useState(false);

  const [title,     setTitle]     = useState('');
  const [message,   setMessage]   = useState('');
  const [type,      setType]      = useState<NotifType>('info');
  const [link,      setLink]      = useState('');
  const [sendEmail, setSendEmail] = useState(false);

  const [sending,   setSending]   = useState(false);
  const [toast,     setToast]     = useState<string | null>(null);
  const [toastErr,  setToastErr]  = useState<string | null>(null);

  const [log,       setLog]       = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(true);

  const searchRef   = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Admin guard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/dashboard'); return; }
      supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (!data?.is_admin) { router.replace('/dashboard'); return; }
          setChecking(false);
        });
    });
  }, []);

  // ── Load history ────────────────────────────────────────────────────────────

  const loadLog = useCallback(async () => {
    setLogLoading(true);
    const res = await fetch('/api/admin/notifications');
    if (res.ok) setLog(await res.json());
    setLogLoading(false);
  }, []);

  useEffect(() => { if (!checking) loadLog(); }, [checking, loadLog]);

  // ── User search ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!showDrop) return;
    function h(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showDrop]);

  function handleSearchChange(v: string) {
    setSearchQ(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!v.trim()) { setResults([]); setShowDrop(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/admin/notifications?q=${encodeURIComponent(v)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setShowDrop(data.length > 0);
      }
      setSearching(false);
    }, 300);
  }

  function selectUser(p: Profile) {
    setSelected(p);
    setSearchQ('');
    setResults([]);
    setShowDrop(false);
  }

  function clearUser() {
    setSelected(null);
    setSearchQ('');
    setResults([]);
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  function showToast(msg: string, err = false) {
    if (err) { setToastErr(msg); setTimeout(() => setToastErr(null), 4000); }
    else     { setToast(msg);    setTimeout(() => setToast(null),    4000); }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'specific' && !selected) {
      showToast('Select a user first.', true); return;
    }
    setSending(true);
    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:        mode === 'all' ? 'all' : selected!.id,
        title:     title.trim(),
        message:   message.trim(),
        type,
        link:      link.trim() || null,
        sendEmail,
      }),
    });
    setSending(false);
    if (!res.ok) {
      const err = await res.json();
      showToast(err.error ?? 'Failed to send.', true); return;
    }
    const { count } = await res.json();
    showToast(`Notification sent to ${count} ${count === 1 ? 'user' : 'users'}.`);
    setTitle(''); setMessage(''); setLink(''); setType('info');
    setSendEmail(false); setSelected(null); setMode('all');
    loadLog();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (checking) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    );
  }

  return (
    <div className="p-8 md:p-10 max-w-4xl">

      {/* Toasts */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-bg-elevated border border-signal-green/40 text-signal-green text-sm px-4 py-2.5 rounded-lg shadow-xl font-mono">
          <CheckCircle size={14} /> {toast}
        </div>
      )}
      {toastErr && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-bg-elevated border border-signal-red/40 text-signal-red text-sm px-4 py-2.5 rounded-lg shadow-xl font-mono">
          <AlertTriangle size={14} /> {toastErr}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <Shield size={14} className="text-accent" />
          <p className="font-mono text-xs uppercase tracking-widest text-accent">Admin</p>
        </div>
        <h1 className="text-3xl font-bold text-text tracking-tight">Send Notification</h1>
        <p className="text-text-muted text-sm mt-1">Send in-app notifications (and optional emails) to your users.</p>
      </div>

      {/* ── Send form ── */}
      <form onSubmit={handleSend} className="card rounded-xl p-7 mb-6 space-y-5">

        {/* To */}
        <div>
          <label className="text-sm font-medium text-text-muted mb-3 block">Recipients</label>
          <div className="flex gap-3">
            {([
              { v: 'all',      label: 'All users',     Icon: Users },
              { v: 'specific', label: 'Specific user',  Icon: User  },
            ] as const).map(({ v, label, Icon }) => (
              <button
                key={v} type="button"
                onClick={() => { setMode(v); clearUser(); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  mode === v
                    ? 'bg-accent/10 border-accent/50 text-accent'
                    : 'border-border text-text-muted hover:border-border-strong hover:text-text'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* User search */}
        {mode === 'specific' && (
          <div>
            <label className="text-sm font-medium text-text-muted mb-2 block">User</label>
            {selected ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-accent/5 border border-accent/30">
                <User size={14} className="text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text font-medium truncate">
                    {selected.full_name || selected.email}
                  </p>
                  {selected.full_name && (
                    <p className="text-xs text-text-muted truncate">{selected.email}</p>
                  )}
                </div>
                <button type="button" onClick={clearUser} className="text-text-muted hover:text-text transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative" ref={searchRef}>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={searchQ}
                    onChange={e => handleSearchChange(e.target.value)}
                    onFocus={() => results.length > 0 && setShowDrop(true)}
                    placeholder="Search by email…"
                    className="form-input pl-9"
                    autoComplete="off"
                  />
                  {searching && (
                    <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-text-muted" />
                  )}
                </div>
                {showDrop && results.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 z-30 bg-bg-surface border border-border rounded-lg shadow-2xl overflow-hidden">
                    {results.map(p => (
                      <button
                        key={p.id} type="button"
                        onClick={() => selectUser(p)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-elevated transition-colors text-left"
                      >
                        <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                          <span className="font-mono text-[9px] text-accent font-bold uppercase">
                            {(p.full_name ?? p.email).charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          {p.full_name && (
                            <p className="text-sm text-text font-medium truncate">{p.full_name}</p>
                          )}
                          <p className="text-xs text-text-muted truncate">{p.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="text-sm font-medium text-text-muted mb-2 block">Title <span className="text-signal-red">*</span></label>
          <input
            required
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="form-input"
            placeholder="e.g. New feature: Playbook tracker"
            maxLength={120}
          />
        </div>

        {/* Message */}
        <div>
          <label className="text-sm font-medium text-text-muted mb-2 block">Message <span className="text-signal-red">*</span></label>
          <textarea
            required
            rows={3}
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="form-input resize-none"
            placeholder="What do you want to tell your users?"
            maxLength={400}
          />
          <p className="text-xs text-text-muted mt-1 text-right">{message.length}/400</p>
        </div>

        {/* Type + Link */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-muted mb-2 block">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as NotifType)}
              className="form-input"
            >
              {TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-muted mb-2 block">Link (optional)</label>
            <input
              type="text"
              value={link}
              onChange={e => setLink(e.target.value)}
              className="form-input"
              placeholder="/dashboard/playbook"
            />
          </div>
        </div>

        {/* Send email toggle */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={e => setSendEmail(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-9 h-5 rounded-full transition-colors ${sendEmail ? 'bg-accent' : 'bg-bg-elevated border border-border-strong'}`} />
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sendEmail ? 'translate-x-4' : ''}`} />
          </div>
          <div className="flex items-center gap-2">
            <Mail size={14} className={sendEmail ? 'text-accent' : 'text-text-muted'} />
            <span className="text-sm text-text-muted group-hover:text-text transition-colors">
              Also send as email via Resend
            </span>
          </div>
        </label>

        {/* Send button */}
        <div className="pt-1">
          <button type="submit" disabled={sending} className="btn-primary gap-2">
            {sending
              ? <Loader2 size={14} className="animate-spin" />
              : <Send size={14} />}
            {sending ? 'Sending…' : mode === 'all' ? 'Send to all users' : 'Send notification'}
          </button>
        </div>
      </form>

      {/* ── Notification history ── */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <Clock size={15} className="text-accent" />
          <h2 className="font-bold text-base text-text">Notification History</h2>
          <span className="font-mono text-xs text-text-muted ml-auto">Last 50</span>
        </div>

        {logLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-accent" size={22} />
          </div>
        ) : log.length === 0 ? (
          <div className="py-12 text-center">
            <Bell size={28} className="text-text-muted mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-text-muted text-sm">No notifications sent yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="font-mono text-xs tracking-wider text-text-muted uppercase border-b border-border bg-bg-elevated">
                  <th className="text-left px-5 py-3">Notification</th>
                  <th className="text-left px-4 py-3 w-28">Type</th>
                  <th className="text-right px-4 py-3 w-28">Recipients</th>
                  <th className="text-right px-4 py-3 w-10">Email</th>
                  <th className="text-right px-5 py-3 w-36">Sent</th>
                </tr>
              </thead>
              <tbody>
                {log.map(entry => {
                  const Icon = TYPE_ICON[entry.type] ?? Info;
                  return (
                    <tr key={entry.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-start gap-2.5">
                          <Icon size={14} className={`shrink-0 mt-0.5 ${TYPE_BADGE[entry.type]?.match(/text-\S+/)?.[0] ?? 'text-accent'}`} strokeWidth={1.7} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text leading-snug">{entry.title}</p>
                            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{entry.message}</p>
                            {entry.link && (
                              <p className="font-mono text-[10px] text-accent/70 mt-0.5">{entry.link}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded-full ${TYPE_BADGE[entry.type] ?? ''}`}>
                          {entry.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-mono text-sm text-text-muted">
                          {entry.to_all
                            ? <span className="flex items-center justify-end gap-1"><Users size={11} /> All ({entry.recipient_count})</span>
                            : entry.recipient_count}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {entry.sent_email
                          ? <Mail size={13} className="text-accent ml-auto" />
                          : <span className="text-text-muted text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-text-muted whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
