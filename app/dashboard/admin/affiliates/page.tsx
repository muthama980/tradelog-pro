'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Shield, Loader2, Check, AlertTriangle, X,
  ExternalLink, Copy, ChevronDown, ChevronUp,
  UserPlus, Link2,
} from 'lucide-react';
import { CardSkeleton } from '@/components/dashboard/Skeleton';

interface Application {
  id: string;
  name: string;
  email: string;
  platform: string;
  channel_url: string;
  audience_size: string | null;
  niche: string | null;
  country: string | null;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const PLATFORM_BADGE: Record<string, string> = {
  youtube:   'bg-red-500/10 border-red-500/30 text-red-400',
  twitter:   'bg-sky-500/10 border-sky-500/30 text-sky-400',
  facebook:  'bg-blue-600/10 border-blue-600/30 text-blue-400',
  instagram: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  tiktok:    'bg-zinc-500/10 border-zinc-500/30 text-zinc-300',
  blog:      'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  other:     'bg-zinc-500/10 border-zinc-500/30 text-zinc-400',
};

const PLATFORM_LABEL: Record<string, string> = {
  youtube: 'YouTube', twitter: 'Twitter/X', facebook: 'Facebook',
  instagram: 'Instagram', tiktok: 'TikTok', blog: 'Blog', other: 'Other',
};

const STATUS_BADGE: Record<string, string> = {
  pending:  'bg-amber-500/10 border-amber-500/30 text-amber-400',
  approved: 'bg-signal-green/10 border-signal-green/30 text-signal-green',
  rejected: 'bg-signal-red/10 border-signal-red/30 text-signal-red',
};

type Filter = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminAffiliatesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking,   setChecking]   = useState(true);
  const [loading,    setLoading]    = useState(true);
  const [apps,       setApps]       = useState<Application[]>([]);
  const [filter,     setFilter]     = useState<Filter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId,   setCopiedId]   = useState<string | null>(null);
  const [toast,      setToast]      = useState<string | null>(null);
  const [toastErr,   setToastErr]   = useState<string | null>(null);
  const [actioning,  setActioning]  = useState<string | null>(null);

  // Approval modal
  const [approvalModal, setApprovalModal] = useState<{ id: string; name: string; email: string } | null>(null);
  const [refCode,       setRefCode]       = useState('');
  const [creatingRef,   setCreatingRef]   = useState(false);

  // Notes auto-save debounce
  const notesTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});

  // ── Admin guard ──────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/dashboard'); return; }
      supabase.from('profiles').select('is_admin').eq('id', user.id).single().then(({ data }) => {
        if (!data?.is_admin) { router.replace('/dashboard'); return; }
        setChecking(false);
      });
    });
  }, []);

  // ── Load ─────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/affiliates');
    if (res.ok) {
      const d = await res.json();
      const list: Application[] = d.applications || [];
      setApps(list);
      // Seed local notes
      const notes: Record<string, string> = {};
      list.forEach(a => { notes[a.id] = a.admin_notes ?? ''; });
      setLocalNotes(notes);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (!checking) load(); }, [checking, load]);

  // ── Helpers ──────────────────────────────────────────────────

  function showToast(msg: string, err = false) {
    if (err) { setToastErr(msg); setTimeout(() => setToastErr(null), 4000); }
    else     { setToast(msg);    setTimeout(() => setToast(null),    4000); }
  }

  function copyChannel(app: Application) {
    navigator.clipboard.writeText(app.channel_url);
    setCopiedId(app.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }

  // ── Notes auto-save ──────────────────────────────────────────

  function handleNotesChange(id: string, value: string) {
    setLocalNotes(prev => ({ ...prev, [id]: value }));
    clearTimeout(notesTimers.current[id]);
    notesTimers.current[id] = setTimeout(async () => {
      await fetch('/api/admin/affiliates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, admin_notes: value }),
      });
    }, 1000);
  }

  // ── Actions ──────────────────────────────────────────────────

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setActioning(id);
    const res = await fetch('/api/admin/affiliates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setActioning(null);
    if (!res.ok) { showToast('Failed to update status', true); return; }

    if (status === 'approved') {
      const app = apps.find(a => a.id === id);
      if (app) {
        const firstName = app.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        setRefCode(firstName);
        setApprovalModal({ id, name: app.name, email: app.email });
      }
    } else {
      showToast('Application rejected.');
    }
    load();
  }

  async function createReferralLink() {
    if (!approvalModal) return;
    setCreatingRef(true);
    const res = await fetch('/api/admin/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: approvalModal.name,
        code: refCode.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        commission_rate: 36,
      }),
    });
    setCreatingRef(false);
    if (!res.ok) {
      const d = await res.json();
      showToast(d.error || 'Failed to create referral link', true);
      return;
    }
    setApprovalModal(null);
    showToast(`Approved! Referral link "${refCode}" created.`);
  }

  // ── Render ───────────────────────────────────────────────────

  if (checking) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    );
  }

  const filtered = apps.filter(a => filter === 'all' || a.status === filter);
  const counts = {
    pending:  apps.filter(a => a.status === 'pending').length,
    approved: apps.filter(a => a.status === 'approved').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
    total:    apps.length,
  };

  return (
    <div className="p-8 md:p-10 max-w-6xl">

      {/* Toasts */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-bg-elevated border border-signal-green/40 text-signal-green text-sm px-4 py-2.5 rounded-lg shadow-xl font-mono">
          <Check size={13} /> {toast}
        </div>
      )}
      {toastErr && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-bg-elevated border border-signal-red/40 text-signal-red text-sm px-4 py-2.5 rounded-lg shadow-xl font-mono">
          <AlertTriangle size={13} /> {toastErr}
        </div>
      )}

      {/* Approval modal */}
      {approvalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setApprovalModal(null)} />
          <div className="relative card rounded-xl p-8 max-w-md w-full">
            <button onClick={() => setApprovalModal(null)} className="absolute top-5 right-5 text-text-dim hover:text-text transition">
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-signal-green/10 border border-signal-green/30 flex items-center justify-center">
                <Check size={16} className="text-signal-green" />
              </div>
              <h3 className="font-bold text-lg text-text">Application Approved</h3>
            </div>
            <p className="text-text-muted text-sm mb-5">
              Create a partner referral link for <strong className="text-text">{approvalModal.name}</strong>? You can do this later from the Referrals page.
            </p>
            <div className="mb-6">
              <label className="text-sm font-medium text-text-muted mb-1.5 block">Referral code</label>
              <input
                value={refCode}
                onChange={e => setRefCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="form-input font-mono"
                placeholder="e.g. john"
              />
              {refCode && (
                <p className="font-mono text-xs text-accent mt-2">
                  tradelogpro.xyz/signup?ref={refCode}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setApprovalModal(null); showToast('Approved! Create the referral link manually from Referrals.'); }}
                className="btn-secondary flex-1 justify-center text-sm"
              >
                Skip for now
              </button>
              <button
                onClick={createReferralLink}
                disabled={creatingRef || !refCode}
                className="btn-primary flex-1 justify-center gap-2 text-sm"
              >
                {creatingRef ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
                {creatingRef ? 'Creating…' : 'Create link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <Shield size={14} className="text-accent" />
          <p className="font-mono text-xs uppercase tracking-widest text-accent">Admin</p>
        </div>
        <h1 className="text-3xl font-bold text-text tracking-tight">Affiliate Applications</h1>
        <p className="text-text-muted text-sm mt-1">Review and manage partner program applications.</p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Pending',  val: counts.pending,  color: 'text-amber-400' },
            { label: 'Approved', val: counts.approved, color: 'text-signal-green' },
            { label: 'Rejected', val: counts.rejected, color: 'text-signal-red' },
            { label: 'Total',    val: counts.total,    color: 'text-text' },
          ].map(({ label, val, color }) => (
            <div key={label} className="card rounded-xl p-5">
              <p className="mono-label mb-2">{label}</p>
              <p className={`font-mono text-2xl font-bold tabular ${color}`}>{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`font-mono text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-colors ${
              filter === f
                ? 'bg-accent/10 border-accent/40 text-accent'
                : 'border-border text-text-muted hover:text-text'
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto font-mono text-xs text-text-muted">{filtered.length} applications</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card rounded-xl py-16 text-center">
          <UserPlus size={32} className="text-text-muted mx-auto mb-3" strokeWidth={1.2} />
          <p className="text-text-muted text-sm">No {filter !== 'all' ? filter : ''} applications yet.</p>
        </div>
      ) : (
        <div className="card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="font-mono text-xs tracking-wider text-text-muted uppercase border-b border-border bg-bg-elevated">
                  <th className="text-left px-5 py-3">Applicant</th>
                  <th className="text-left px-4 py-3">Platform</th>
                  <th className="text-left px-4 py-3">Channel</th>
                  <th className="text-left px-4 py-3">Audience</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Niche</th>
                  <th className="text-left px-4 py-3 hidden xl:table-cell">Country</th>
                  <th className="text-left px-4 py-3">Applied</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="px-4 py-3 w-px" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(app => {
                  const expanded = expandedId === app.id;
                  return (
                    <>
                      <tr
                        key={app.id}
                        className="border-b border-border/50 hover:bg-bg-elevated/40 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(expanded ? null : app.id)}
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-text">{app.name}</p>
                          <p className="font-mono text-xs text-text-muted">{app.email}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded-full ${PLATFORM_BADGE[app.platform] ?? 'border-border text-text-muted'}`}>
                            {PLATFORM_LABEL[app.platform] ?? app.platform}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <a
                            href={app.channel_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="font-mono text-xs text-accent hover:underline max-w-[180px] truncate block"
                            title={app.channel_url}
                          >
                            {app.channel_url.replace(/^https?:\/\//, '')}
                          </a>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-text-muted">{app.audience_size ?? '—'}</td>
                        <td className="px-4 py-3.5 text-sm text-text-muted hidden lg:table-cell capitalize">{app.niche ?? '—'}</td>
                        <td className="px-4 py-3.5 text-sm text-text-muted hidden xl:table-cell">{app.country ?? '—'}</td>
                        <td className="px-4 py-3.5 font-mono text-xs text-text-muted whitespace-nowrap">{relativeTime(app.created_at)}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded-full ${STATUS_BADGE[app.status]}`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {expanded
                            ? <ChevronUp size={14} className="text-text-muted" />
                            : <ChevronDown size={14} className="text-text-muted" />}
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {expanded && (
                        <tr key={`${app.id}-expanded`} className="border-b border-border/50 bg-bg-elevated/20">
                          <td colSpan={9} className="px-5 py-5">
                            <div className="space-y-5 max-w-3xl">
                              {/* Message */}
                              {app.message && (
                                <div>
                                  <p className="mono-label mb-2">Their message</p>
                                  <p className="text-sm text-text-muted leading-relaxed bg-bg border border-border rounded-lg px-4 py-3">
                                    {app.message}
                                  </p>
                                </div>
                              )}

                              {/* Admin notes */}
                              <div>
                                <p className="mono-label mb-2">Admin notes <span className="normal-case text-text-dim">(auto-saves)</span></p>
                                <textarea
                                  value={localNotes[app.id] ?? ''}
                                  onChange={e => handleNotesChange(app.id, e.target.value)}
                                  placeholder="Internal notes about this applicant…"
                                  rows={3}
                                  className="form-input resize-none text-sm"
                                />
                              </div>

                              {/* Actions */}
                              <div className="flex flex-wrap items-center gap-2">
                                {app.status !== 'approved' && (
                                  <button
                                    onClick={() => updateStatus(app.id, 'approved')}
                                    disabled={actioning === app.id}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-signal-green/10 border border-signal-green/30 text-signal-green text-sm font-medium hover:bg-signal-green/20 transition disabled:opacity-50"
                                  >
                                    {actioning === app.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                    Approve
                                  </button>
                                )}
                                {app.status !== 'rejected' && (
                                  <button
                                    onClick={() => updateStatus(app.id, 'rejected')}
                                    disabled={actioning === app.id}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-signal-red/10 border border-signal-red/30 text-signal-red text-sm font-medium hover:bg-signal-red/20 transition disabled:opacity-50"
                                  >
                                    {actioning === app.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                                    Reject
                                  </button>
                                )}
                                <button
                                  onClick={() => copyChannel(app)}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-text-muted text-sm hover:text-text hover:border-accent/40 transition"
                                >
                                  {copiedId === app.id
                                    ? <><Check size={13} className="text-signal-green" /> Copied</>
                                    : <><Copy size={13} /> Copy Channel URL</>}
                                </button>
                                <a
                                  href={app.channel_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-text-muted text-sm hover:text-text hover:border-accent/40 transition"
                                >
                                  <ExternalLink size={13} /> Open Channel
                                </a>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
