'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Copy, Check, TrendingUp, DollarSign, MousePointer,
  Twitter, Share2, Loader2, ExternalLink, ChevronRight,
} from 'lucide-react';
import { CardSkeleton, TableSkeleton } from '@/components/dashboard/Skeleton';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReferralLink {
  id: string; code: string; type: string; commission_rate: number;
  is_active: boolean; total_clicks: number; created_at: string;
}

interface Referral {
  id: string; status: string; plan: string | null;
  commission_amount: number | null; commission_paid: number;
  signed_up_at: string; subscribed_at: string | null;
  referred_email: string | null; referred_name: string | null;
}

interface Payout {
  id: string; amount: number; method: string | null;
  reference: string | null; paid_at: string;
}

interface Data {
  link: ReferralLink | null;
  stats: { clicks: number; signups: number; subscribers: number; totalEarned: number } | null;
  referrals: Referral[];
  payouts: Payout[];
  pendingEarnings: number;
  totalPaid: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskEmail(email: string | null): string {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!domain || local.length <= 2) return email;
  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}@${domain}`;
}

const STATUS_BADGE: Record<string, string> = {
  signed_up:  'border-amber-400/30 bg-amber-400/10 text-amber-400',
  subscribed: 'border-signal-green/30 bg-signal-green/10 text-signal-green',
  churned:    'border-signal-red/30 bg-signal-red/10 text-signal-red',
};

const STATUS_LABEL: Record<string, string> = {
  signed_up:  'Signed Up',
  subscribed: 'Subscribed',
  churned:    'Churned',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReferralsPage() {
  const [data,      setData]      = useState<Data | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [toast,     setToast]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/referrals');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function generateLink() {
    setGenerating(true);
    const res = await fetch('/api/referrals', { method: 'POST' });
    if (res.ok) { await load(); showToast('Referral link created!'); }
    setGenerating(false);
  }

  function copyLink() {
    if (!data?.link) return;
    navigator.clipboard.writeText(`https://tradelogpro.xyz/signup?ref=${data.link.code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Link copied!');
  }

  const refUrl = data?.link ? `https://tradelogpro.xyz/signup?ref=${data.link.code}` : '';
  const shareText = encodeURIComponent(
    `I use TradeLog Pro to journal my trades and track my edge. Try it free: ${refUrl}`
  );

  if (loading) {
    return (
      <div className="p-8 md:p-10 max-w-5xl">
        <div className="mb-8 animate-pulse">
          <div className="h-3 bg-bg-elevated rounded w-20 mb-3" />
          <div className="h-8 bg-bg-elevated rounded w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <TableSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="p-8 md:p-10 max-w-5xl">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-bg-elevated border border-signal-green/40 text-signal-green text-sm px-4 py-2.5 rounded-lg shadow-xl font-mono tracking-wide flex items-center gap-2">
          <Check size={13} /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <p className="mono-label mb-2">Referrals</p>
        <h1 className="text-3xl font-bold text-text tracking-tight">Earn by sharing.</h1>
        <p className="text-text-muted text-sm mt-1">
          Share your link. Earn {data?.link ? `${Math.round((data.link.commission_rate) * 100)}%` : '10%'} of every subscription your referrals convert to.
        </p>
      </div>

      {/* Referral link section */}
      <div className="card rounded-xl p-6 mb-6">
        {!data?.link ? (
          <div className="text-center py-6">
            <Share2 size={36} className="text-text-muted mx-auto mb-4" strokeWidth={1.2} />
            <h3 className="font-bold text-lg text-text mb-2">Generate your referral link</h3>
            <p className="text-text-muted text-sm mb-6 max-w-sm mx-auto">
              Get a unique link to share with other traders. You'll earn 10% commission on every subscription.
            </p>
            <button onClick={generateLink} disabled={generating} className="btn-primary gap-2">
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
              {generating ? 'Generating…' : 'Generate My Referral Link'}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <div>
                <h3 className="font-bold text-base text-text">Your Referral Link</h3>
                <p className="text-text-muted text-sm mt-0.5">
                  You earn <span className="text-accent font-semibold">{Math.round(data.link.commission_rate * 100)}%</span> of every subscription
                </p>
              </div>
              <span className={`font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                data.link.is_active ? 'border-signal-green/30 bg-signal-green/10 text-signal-green' : 'border-border text-text-dim'
              }`}>
                {data.link.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Link box */}
            <div className="flex items-center gap-2 mb-5">
              <div className="flex-1 bg-bg border border-border rounded-lg px-4 py-2.5 font-mono text-sm text-accent truncate">
                tradelogpro.xyz/signup?ref={data.link.code}
              </div>
              <button
                onClick={copyLink}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-text-muted hover:border-accent/40 hover:text-accent transition font-mono text-[11px] tracking-widest uppercase"
              >
                {copied ? <Check size={13} className="text-signal-green" /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Share buttons */}
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${shareText}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-text-muted hover:border-accent/30 hover:text-text text-xs font-mono tracking-wider transition"
              >
                <Twitter size={13} /> Share on X
              </a>
              <a
                href={`https://wa.me/?text=${shareText}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-text-muted hover:border-signal-green/30 hover:text-text text-xs font-mono tracking-wider transition"
              >
                <Share2 size={13} /> WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(refUrl)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-text-muted hover:border-accent/30 hover:text-text text-xs font-mono tracking-wider transition"
              >
                <ExternalLink size={13} /> Facebook
              </a>
            </div>
          </>
        )}
      </div>

      {/* Stats cards */}
      {data?.link && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Clicks',       val: data.stats?.clicks      ?? 0, icon: MousePointer, color: 'text-accent' },
            { label: 'Signups',            val: data.stats?.signups     ?? 0, icon: Users,        color: 'text-text-muted' },
            { label: 'Active Subscribers', val: data.stats?.subscribers ?? 0, icon: TrendingUp,   color: 'text-signal-green' },
            { label: 'Total Earned',       val: `$${(data.stats?.totalEarned ?? 0).toFixed(2)}`, icon: DollarSign, color: 'text-accent' },
          ].map((k, i) => {
            const Icon = k.icon;
            return (
              <div key={i} className="card rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="mono-label">{k.label}</span>
                  <Icon size={13} className={k.color} strokeWidth={1.7} />
                </div>
                <p className={`font-mono text-2xl font-bold tabular ${k.color}`}>{k.val}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Referred users table */}
      {data?.link && (
        <div className="card rounded-xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-bold text-base text-text">Referred Users</h3>
          </div>
          {data.referrals.length === 0 ? (
            <div className="py-12 text-center">
              <Users size={28} className="text-text-muted mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-text-muted text-sm">No referrals yet. Share your link to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="font-mono text-xs tracking-wider text-text-muted uppercase border-b border-border bg-bg-elevated">
                    <th className="text-left px-5 py-3">Email</th>
                    <th className="text-left px-4 py-3">Signed Up</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Plan</th>
                    <th className="text-right px-5 py-3">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {data.referrals.map(r => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                      <td className="px-5 py-3 font-mono text-sm text-text">{maskEmail(r.referred_email)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-text-muted whitespace-nowrap">
                        {new Date(r.signed_up_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded-full ${STATUS_BADGE[r.status] ?? ''}`}>
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {r.plan ? (
                          <span className="font-mono text-xs uppercase tracking-wider text-text-muted">{r.plan}</span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-sm">
                        {r.commission_amount != null
                          ? <span className="text-signal-green font-bold">+${Number(r.commission_amount).toFixed(2)}/mo</span>
                          : <span className="text-text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Earnings & Payouts */}
      {data?.link && (
        <div className="card rounded-xl p-6">
          <h3 className="font-bold text-base text-text mb-5">Earnings & Payouts</h3>

          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <div className="bg-bg border border-border rounded-xl p-4">
              <p className="mono-label mb-2">Pending Earnings</p>
              <p className="font-mono text-2xl font-bold text-accent tabular">
                ${(data.pendingEarnings ?? 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-bg border border-border rounded-xl p-4">
              <p className="mono-label mb-2">Total Paid Out</p>
              <p className="font-mono text-2xl font-bold text-signal-green tabular">
                ${(data.totalPaid ?? 0).toFixed(2)}
              </p>
            </div>
          </div>

          <p className="text-text-muted text-xs mb-5 border border-border/50 rounded-lg px-4 py-3 bg-bg">
            Payouts are processed monthly. Minimum payout: $10. Contact support to request a payout via M-Pesa, PayPal, or crypto.
          </p>

          {data.payouts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="font-mono text-xs tracking-wider text-text-muted uppercase border-b border-border bg-bg-elevated">
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Method</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payouts.map(p => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="px-4 py-3 font-mono text-xs text-text-muted whitespace-nowrap">
                        {new Date(p.paid_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-signal-green">+${Number(p.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-sm text-text-muted capitalize">{p.method ?? '—'}</td>
                      <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-text-muted">{p.reference ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
