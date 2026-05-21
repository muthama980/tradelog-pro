'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Shield, Plus, Loader2, Check, AlertTriangle, ChevronLeft,
  ToggleLeft, ToggleRight, Trash2, X, Users, DollarSign,
  TrendingUp, Link2, ChevronDown, ChevronUp, Copy,
} from 'lucide-react';
import { CardSkeleton } from '@/components/dashboard/Skeleton';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReferralLink {
  id: string; code: string; type: 'partner' | 'user';
  user_id: string;
  label: string | null; commission_rate: number;
  is_active: boolean; total_clicks: number; created_at: string;
  referrer_email: string | null; referrer_name: string | null;
  signup_count: number; subscriber_count: number;
  total_earned: number; total_comm_paid: number;
}

interface Referral {
  id: string; status: string; plan: string | null;
  subscription_amount: number | null; commission_amount: number | null;
  commission_paid: number; signed_up_at: string; subscribed_at: string | null;
  referred_id: string; referrer_id: string;
}

interface Overview {
  partnerLinks: number; userLinks: number; totalReferred: number;
  onTrial: number; totalSubscribed: number; totalOwed: number; totalPaid: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, string> = {
  partner: 'border-accent/30 bg-accent/10 text-accent',
  user:    'border-border bg-bg-elevated text-text-muted',
};

const STATUS_BADGE: Record<string, string> = {
  signed_up:  'border-blue-400/30 bg-blue-400/10 text-blue-400',
  subscribed: 'border-signal-green/30 bg-signal-green/10 text-signal-green',
  churned:    'border-signal-red/30 bg-signal-red/10 text-signal-red',
};

const STATUS_LABEL: Record<string, string> = {
  signed_up: 'Trial', subscribed: 'Subscribed', churned: 'Churned',
};

const METHODS = ['M-Pesa', 'PayPal', 'Crypto', 'Manual'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminReferralsPage() {
  const router  = useRouter();
  const supabase = createClient();

  const [checking,    setChecking]    = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [links,       setLinks]       = useState<ReferralLink[]>([]);
  const [overview,    setOverview]    = useState<Overview | null>(null);
  const [filter,      setFilter]      = useState<'all' | 'partner' | 'user'>('all');
  const [selectedLink, setSelectedLink] = useState<ReferralLink | null>(null);
  const [detailReferrals, setDetailReferrals] = useState<Referral[]>([]);
  const [detailProfiles,  setDetailProfiles]  = useState<Record<string, { email: string; full_name: string | null }>>({});
  const [detailLoading,   setDetailLoading]   = useState(false);

  // Create form
  const [showForm,   setShowForm]   = useState(false);
  const [fLabel,     setFLabel]     = useState('');
  const [fCode,      setFCode]      = useState('');
  const [fRate,      setFRate]      = useState('36');
  const [fUserId,    setFUserId]    = useState('');
  const [fUserSearch, setFUserSearch] = useState('');
  const [userResults, setUserResults] = useState<{ id: string; email: string; full_name: string | null }[]>([]);
  const [fSaving,    setFSaving]    = useState(false);

  // Pay modal
  const [payModal,   setPayModal]   = useState<{ referrer_id: string; referral_ids: string[]; maxAmount: number } | null>(null);
  const [payAmount,  setPayAmount]  = useState('');
  const [payMethod,  setPayMethod]  = useState('Manual');
  const [payRef,     setPayRef]     = useState('');
  const [payNotes,   setPayNotes]   = useState('');
  const [paying,     setPaying]     = useState(false);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toast,      setToast]      = useState<string | null>(null);
  const [toastErr,   setToastErr]   = useState<string | null>(null);

  function copyRefUrl(code: string) {
    navigator.clipboard.writeText(`https://tradelogpro.xyz/signup?ref=${code}`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function showToast(msg: string, err = false) {
    if (err) { setToastErr(msg); setTimeout(() => setToastErr(null), 4000); }
    else     { setToast(msg);    setTimeout(() => setToast(null),    4000); }
  }

  // ── Admin guard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/dashboard'); return; }
      supabase.from('profiles').select('is_admin').eq('id', user.id).single().then(({ data }) => {
        if (!data?.is_admin) { router.replace('/dashboard'); return; }
        setChecking(false);
      });
    });
  }, []);

  // ── Load data ───────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/referrals');
    if (res.ok) {
      const d = await res.json();
      setLinks(d.links || []);
      setOverview(d.overview || null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (!checking) load(); }, [checking, load]);

  // ── Detail view ─────────────────────────────────────────────────────────────

  async function openDetail(link: ReferralLink) {
    setSelectedLink(link);
    setDetailLoading(true);
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*')
      .eq('referral_link_id', link.id)
      .order('signed_up_at', { ascending: false });

    const refList = referrals || [];
    const ids = refList.map(r => r.referred_id);
    const { data: profiles } = ids.length
      ? await supabase.from('profiles').select('id, email, full_name').in('id', ids)
      : { data: [] };

    const pMap: Record<string, { email: string; full_name: string | null }> = {};
    (profiles || []).forEach(p => { pMap[p.id] = p; });

    setDetailReferrals(refList);
    setDetailProfiles(pMap);
    setDetailLoading(false);
  }

  // ── Create partner link ──────────────────────────────────────────────────────

  async function searchUsers(q: string) {
    setFUserSearch(q);
    if (!q.trim()) { setUserResults([]); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .ilike('email', `%${q}%`)
      .limit(5);
    setUserResults(data || []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFSaving(true);
    const res = await fetch('/api/admin/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: fLabel, code: fCode, commission_rate: Number(fRate), user_id: fUserId || undefined }),
    });
    setFSaving(false);
    if (!res.ok) { const d = await res.json(); showToast(d.error || 'Failed', true); return; }
    showToast('Partner link created.');
    setShowForm(false); setFLabel(''); setFCode(''); setFRate('36'); setFUserId(''); setFUserSearch('');
    load();
  }

  // ── Toggle active ────────────────────────────────────────────────────────────

  async function toggleActive(link: ReferralLink) {
    await fetch('/api/admin/referrals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: link.id, is_active: !link.is_active }),
    });
    load();
    if (selectedLink?.id === link.id) setSelectedLink({ ...link, is_active: !link.is_active });
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function deleteLink(id: string) {
    if (!confirm('Delete this referral link? This cannot be undone.')) return;
    await fetch(`/api/admin/referrals?id=${id}`, { method: 'DELETE' });
    if (selectedLink?.id === id) setSelectedLink(null);
    load();
    showToast('Link deleted.');
  }

  // ── Payout ───────────────────────────────────────────────────────────────────

  function openPayModal(referrer_id: string, referral_ids: string[], maxAmount: number) {
    setPayModal({ referrer_id, referral_ids, maxAmount });
    setPayAmount(maxAmount.toFixed(2));
    setPayMethod('Manual'); setPayRef(''); setPayNotes('');
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!payModal) return;
    setPaying(true);
    const res = await fetch('/api/admin/referrals/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referrer_id:  payModal.referrer_id,
        amount:       Number(payAmount),
        method:       payMethod,
        reference:    payRef || undefined,
        notes:        payNotes || undefined,
        referral_ids: payModal.referral_ids,
      }),
    });
    setPaying(false);
    if (!res.ok) { const d = await res.json(); showToast(d.error || 'Failed', true); return; }
    showToast('Payout recorded.');
    setPayModal(null);
    load();
    if (selectedLink) openDetail(selectedLink);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (checking) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    );
  }

  const filteredLinks = links.filter(l => filter === 'all' || l.type === filter);

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

      {/* Pay modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setPayModal(null)} />
          <div className="relative card rounded-xl p-8 max-w-md w-full">
            <button onClick={() => setPayModal(null)} className="absolute top-5 right-5 text-text-dim hover:text-text transition"><X size={18} /></button>
            <h3 className="font-bold text-xl text-text mb-1">Record Payout</h3>
            <p className="text-text-muted text-sm mb-6">Max owed: <span className="text-accent font-mono">${payModal.maxAmount.toFixed(2)}</span></p>
            <form onSubmit={handlePay} className="space-y-4">
              <FF label="Amount ($)">
                <input required type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="form-input" />
              </FF>
              <FF label="Method">
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="form-input">
                  {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </FF>
              <FF label="Reference / Transaction ID">
                <input type="text" value={payRef} onChange={e => setPayRef(e.target.value)} className="form-input" placeholder="Optional" />
              </FF>
              <FF label="Notes">
                <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)} className="form-input" placeholder="Optional" />
              </FF>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPayModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={paying} className="btn-primary flex-1 justify-center gap-2">
                  {paying ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {paying ? 'Recording…' : 'Confirm Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <Shield size={14} className="text-accent" />
          <p className="font-mono text-xs uppercase tracking-widest text-accent">Admin</p>
        </div>
        <h1 className="text-3xl font-bold text-text tracking-tight">Referral Program</h1>
        <p className="text-text-muted text-sm mt-1">Manage partner and user referral links, track conversions, and record payouts.</p>
      </div>

      {/* Overview stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Referred',   val: overview.totalReferred,                    icon: Users,       color: 'text-text-muted' },
            { label: 'On Trial',         val: overview.onTrial,                          icon: TrendingUp,  color: 'text-blue-400' },
            { label: 'Subscribed',       val: overview.totalSubscribed,                  icon: TrendingUp,  color: 'text-signal-green' },
            {
              label: 'Conversion Rate',
              val: overview.totalReferred > 0
                ? `${Math.round((overview.totalSubscribed / overview.totalReferred) * 100)}%`
                : '—',
              icon: TrendingUp, color: 'text-accent',
            },
            { label: 'Commission Owed',  val: `$${overview.totalOwed.toFixed(2)}`,       icon: DollarSign,  color: 'text-amber-400' },
            { label: 'Total Paid Out',   val: `$${overview.totalPaid.toFixed(2)}`,       icon: DollarSign,  color: 'text-signal-green' },
          ].map((k, i) => {
            const Icon = k.icon;
            return (
              <div key={i} className="card rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="mono-label">{k.label}</span>
                  <Icon size={13} className={k.color} strokeWidth={1.7} />
                </div>
                <p className={`font-mono text-xl font-bold tabular ${k.color}`}>{k.val}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail view */}
      {selectedLink ? (
        <div>
          <button
            onClick={() => setSelectedLink(null)}
            className="flex items-center gap-1.5 text-text-muted hover:text-text text-sm transition-colors mb-6"
          >
            <ChevronLeft size={15} /> All Links
          </button>

          <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h2 className="text-2xl font-bold text-text tracking-tight font-mono">{selectedLink.code}</h2>
                <button
                  onClick={() => copyRefUrl(selectedLink.code)}
                  className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-lg border border-border text-text-muted hover:border-accent/40 hover:text-accent transition"
                  title="Copy full referral URL"
                >
                  {copiedCode === selectedLink.code
                    ? <><Check size={11} className="text-signal-green" /> Copied</>
                    : <><Copy size={11} /> Copy URL</>}
                </button>
                <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded-full ${TYPE_BADGE[selectedLink.type]}`}>
                  {selectedLink.type}
                </span>
                <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded-full ${
                  selectedLink.is_active ? 'border-signal-green/30 bg-signal-green/10 text-signal-green' : 'border-border text-text-dim'
                }`}>
                  {selectedLink.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {selectedLink.label && <p className="text-text-muted text-sm">{selectedLink.label}</p>}
              <p className="text-text-muted text-sm mt-0.5">
                Commission: <span className="text-accent font-semibold">{Math.round(selectedLink.commission_rate * 100)}%</span>
                {selectedLink.referrer_email && <> · Referrer: <span className="text-text">{selectedLink.referrer_email}</span></>}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleActive(selectedLink)} className="btn-secondary text-sm gap-2 py-2 px-3">
                {selectedLink.is_active ? <ToggleRight size={14} className="text-signal-green" /> : <ToggleLeft size={14} />}
                {selectedLink.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => deleteLink(selectedLink.id)} className="py-2 px-3 rounded-lg border border-signal-red/30 text-signal-red hover:bg-signal-red/10 text-sm transition flex items-center gap-1.5">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>

          {/* Owed vs paid summary */}
          {(() => {
            const subscribed = detailReferrals.filter(r => r.status === 'subscribed');
            const totalOwed  = subscribed.reduce((s, r) => s + Number(r.commission_amount || 0) - Number(r.commission_paid || 0), 0);
            const totalPaid  = subscribed.reduce((s, r) => s + Number(r.commission_paid || 0), 0);
            return (
              <div className="grid sm:grid-cols-3 gap-3 mb-6">
                <div className="card rounded-xl p-4">
                  <p className="mono-label mb-1">Subscribed Referrals</p>
                  <p className="font-mono text-xl font-bold text-text">{subscribed.length}</p>
                </div>
                <div className="card rounded-xl p-4">
                  <p className="mono-label mb-1">Commission Owed</p>
                  <p className="font-mono text-xl font-bold text-amber-400">${Math.max(0, totalOwed).toFixed(2)}</p>
                </div>
                <div className="card rounded-xl p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="mono-label mb-1">Paid Out</p>
                    <p className="font-mono text-xl font-bold text-signal-green">${totalPaid.toFixed(2)}</p>
                  </div>
                  {totalOwed > 0 && (
                    <button
                      onClick={() => openPayModal(
                        selectedLink.user_id ?? '',
                        subscribed.map(r => r.id),
                        totalOwed
                      )}
                      className="btn-primary text-xs py-1.5 px-3 shrink-0"
                    >
                      Pay All
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Referrals table */}
          <div className="card rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="font-bold text-sm text-text">Referred Users</h3>
            </div>
            {detailLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-accent" size={22} /></div>
            ) : detailReferrals.length === 0 ? (
              <div className="py-10 text-center"><p className="text-text-muted text-sm">No referrals for this link yet.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="font-mono text-xs tracking-wider text-text-muted uppercase border-b border-border bg-bg-elevated">
                      <th className="text-left px-5 py-3">Email</th>
                      <th className="text-left px-4 py-3">Signed Up</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Plan</th>
                      <th className="text-right px-4 py-3">Commission</th>
                      <th className="text-right px-5 py-3">Paid</th>
                      <th className="px-4 py-3 w-px" />
                    </tr>
                  </thead>
                  <tbody>
                    {detailReferrals.map(r => {
                      const prof   = detailProfiles[r.referred_id];
                      const owed   = Number(r.commission_amount || 0) - Number(r.commission_paid || 0);
                      return (
                        <tr key={r.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                          <td className="px-5 py-3">
                            <p className="text-sm text-text font-medium">{prof?.full_name || prof?.email || '—'}</p>
                            {prof?.full_name && <p className="font-mono text-xs text-text-muted">{prof.email}</p>}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-text-muted whitespace-nowrap">
                            {new Date(r.signed_up_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded-full ${STATUS_BADGE[r.status] ?? ''}`}>
                              {STATUS_LABEL[r.status] ?? r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-text-muted uppercase">{r.plan ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm">
                            {r.commission_amount != null
                              ? <span className="text-signal-green font-bold">+${Number(r.commission_amount).toFixed(2)}/mo</span>
                              : '—'}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-sm text-text-muted">
                            ${Number(r.commission_paid).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            {owed > 0 && (
                              <button
                                onClick={() => openPayModal(r.referrer_id ?? selectedLink.user_id, [r.id], owed)}
                                className="font-mono text-[10px] uppercase tracking-widest text-accent hover:underline transition"
                              >
                                Pay
                              </button>
                            )}
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
      ) : (
        <>
          {/* Create partner link form */}
          <div className="card rounded-xl overflow-hidden mb-6">
            <button
              onClick={() => setShowForm(v => !v)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-bg-elevated/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Plus size={15} className="text-accent" />
                <span className="font-bold text-sm text-text">Create Partner Referral Link</span>
              </div>
              {showForm ? <ChevronUp size={15} className="text-text-muted" /> : <ChevronDown size={15} className="text-text-muted" />}
            </button>

            {showForm && (
              <form onSubmit={handleCreate} className="px-6 pb-6 space-y-4 border-t border-border pt-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FF label="Partner Name / Label *">
                    <input required value={fLabel} onChange={e => setFLabel(e.target.value)} className="form-input" placeholder='e.g. "Neymond Ke - Facebook influencer"' />
                  </FF>
                  <FF label="Custom Code *">
                    <input required value={fCode} onChange={e => setFCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className="form-input font-mono" placeholder='e.g. "neymond"' />
                  </FF>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <FF label="Commission Rate (%)">
                    <input type="number" min="0" max="100" step="1" value={fRate} onChange={e => setFRate(e.target.value)} className="form-input" />
                  </FF>
                  <FF label="Assign to User (optional)">
                    <div className="relative">
                      <input
                        type="text"
                        value={fUserSearch}
                        onChange={e => searchUsers(e.target.value)}
                        className="form-input"
                        placeholder="Search by email…"
                        autoComplete="off"
                      />
                      {userResults.length > 0 && (
                        <div className="absolute top-full mt-1 left-0 right-0 z-30 bg-bg-surface border border-border rounded-lg shadow-2xl overflow-hidden">
                          {userResults.map(u => (
                            <button
                              key={u.id} type="button"
                              onClick={() => { setFUserId(u.id); setFUserSearch(u.email); setUserResults([]); }}
                              className="w-full flex flex-col items-start px-4 py-2.5 hover:bg-bg-elevated transition-colors text-left"
                            >
                              {u.full_name && <span className="text-sm text-text">{u.full_name}</span>}
                              <span className="text-xs text-text-muted">{u.email}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </FF>
                </div>
                {fCode && (
                  <p className="font-mono text-xs text-accent">
                    Link preview: tradelogpro.xyz/signup?ref={fCode}
                  </p>
                )}
                <button type="submit" disabled={fSaving} className="btn-primary gap-2">
                  {fSaving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  {fSaving ? 'Creating…' : 'Create Partner Link'}
                </button>
              </form>
            )}
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2 mb-4">
            {(['all', 'partner', 'user'] as const).map(f => (
              <button
                key={f} onClick={() => setFilter(f)}
                className={`font-mono text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-colors ${
                  filter === f ? 'bg-accent/10 border-accent/40 text-accent' : 'border-border text-text-muted hover:text-text'
                }`}
              >
                {f}
              </button>
            ))}
            <span className="ml-auto font-mono text-xs text-text-muted">{filteredLinks.length} links</span>
          </div>

          {/* All links table */}
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
          ) : filteredLinks.length === 0 ? (
            <div className="card rounded-xl py-16 text-center">
              <Link2 size={32} className="text-text-muted mx-auto mb-3" strokeWidth={1.2} />
              <p className="text-text-muted text-sm">No {filter !== 'all' ? filter : ''} referral links yet.</p>
            </div>
          ) : (
            <div className="card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="font-mono text-xs tracking-wider text-text-muted uppercase border-b border-border bg-bg-elevated">
                      <th className="text-left px-5 py-3">Code</th>
                      <th className="text-left px-4 py-3">Type</th>
                      <th className="text-left px-4 py-3 hidden lg:table-cell">Label / Referrer</th>
                      <th className="text-right px-4 py-3">Rate</th>
                      <th className="text-right px-4 py-3">Clicks</th>
                      <th className="text-right px-4 py-3">Signups</th>
                      <th className="text-right px-4 py-3">Subs</th>
                      <th className="text-right px-4 py-3">Earned</th>
                      <th className="text-center px-4 py-3">Status</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLinks.map(link => (
                      <tr
                        key={link.id}
                        className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors cursor-pointer"
                        onClick={() => openDetail(link)}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-accent">{link.code}</span>
                            <button
                              onClick={e => { e.stopPropagation(); copyRefUrl(link.code); }}
                              className="text-text-dim hover:text-accent transition-colors"
                              title={`Copy full URL`}
                            >
                              {copiedCode === link.code
                                ? <Check size={11} className="text-signal-green" />
                                : <Copy size={11} />}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded-full ${TYPE_BADGE[link.type]}`}>
                            {link.type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <p className="text-sm text-text truncate max-w-[180px]">{link.label || link.referrer_name || '—'}</p>
                          {link.referrer_email && <p className="font-mono text-xs text-text-muted truncate">{link.referrer_email}</p>}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-sm text-text-muted">{Math.round(link.commission_rate * 100)}%</td>
                        <td className="px-4 py-3.5 text-right font-mono text-sm text-text-muted">{link.total_clicks}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-sm text-text-muted">{link.signup_count}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-sm text-text-muted">{link.subscriber_count}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-sm text-signal-green font-bold">${link.total_earned.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-center" onClick={e => { e.stopPropagation(); toggleActive(link); }}>
                          {link.is_active
                            ? <ToggleRight size={18} className="text-signal-green mx-auto cursor-pointer" />
                            : <ToggleLeft  size={18} className="text-text-dim   mx-auto cursor-pointer" />}
                        </td>
                        <td className="px-5 py-3.5" onClick={e => { e.stopPropagation(); deleteLink(link.id); }}>
                          <Trash2 size={14} className="text-text-dim hover:text-signal-red transition-colors" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-text-muted mb-2 block">{label}</label>
      {children}
    </div>
  );
}
