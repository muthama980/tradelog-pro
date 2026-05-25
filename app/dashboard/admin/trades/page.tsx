'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Shield, Loader2, Search, BarChart3 } from 'lucide-react';
import ImageLightbox from '@/components/dashboard/ImageLightbox';

interface Trade {
  id: string;
  user_id: string;
  symbol: string;
  direction: 'long' | 'short';
  entry_price: number;
  exit_price: number | null;
  pnl: number | null;
  strategy: string | null;
  emotion: string | null;
  mistakes: string[] | null;
  broker: string | null;
  screenshot_url: string | null;
  opened_at: string;
  profiles: { email: string; full_name: string | null; display_name: string | null } | null;
}

const POSITIVE_EMOTIONS = ['calm', 'confident', 'disciplined', 'patient', 'focused', 'in-the-zone'];

export default function AdminTradesPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [checking,   setChecking]   = useState(true);
  const [trades,     setTrades]     = useState<Trade[]>([]);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Draft filter inputs
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [direction,   setDirection]   = useState('all');
  const [pnlFilter,   setPnlFilter]   = useState('all');
  const [page,        setPage]        = useState(1);

  // Applied filters (drive API calls)
  const [appliedFilters, setAppliedFilters] = useState({
    search: '', dateFrom: '', dateTo: '', direction: 'all', pnl: 'all',
  });

  // Admin guard
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/dashboard'); return; }
      supabase.from('profiles').select('is_admin').eq('id', user.id).single().then(({ data }) => {
        if (!data?.is_admin) { router.replace('/dashboard'); return; }
        setChecking(false);
      });
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (appliedFilters.search)                      params.set('search',     appliedFilters.search);
    if (appliedFilters.dateFrom)                    params.set('date_from',  appliedFilters.dateFrom);
    if (appliedFilters.dateTo)                      params.set('date_to',    appliedFilters.dateTo);
    if (appliedFilters.direction !== 'all')         params.set('direction',  appliedFilters.direction);
    if (appliedFilters.pnl !== 'all')               params.set('pnl_filter', appliedFilters.pnl);

    const res = await fetch(`/api/admin/trades?${params}`);
    if (res.ok) {
      const d = await res.json();
      setTrades(d.trades);
      setTotal(d.total);
      setPages(d.pages);
    }
    setLoading(false);
  }, [appliedFilters, page]);

  useEffect(() => {
    if (!checking) load();
  }, [checking, load]);

  function applyFilters() {
    setPage(1);
    setAppliedFilters({ search: searchInput, dateFrom, dateTo, direction, pnl: pnlFilter });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') applyFilters();
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    );
  }

  return (
    <div className="p-8 md:p-10 max-w-7xl">
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} alt="Trade screenshot" onClose={() => setLightboxSrc(null)} />
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <Shield size={14} className="text-accent" />
          <p className="font-mono text-xs uppercase tracking-widest text-accent">Admin</p>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-bold text-text tracking-tight">All Trades</h1>
          <span className="font-mono text-sm text-text-muted bg-bg-elevated border border-border px-3 py-1 rounded-lg">
            {total.toLocaleString()} total
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="card rounded-xl p-5 mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by email…"
              className="form-input pl-8"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="form-input flex-1"
              title="From date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="form-input flex-1"
              title="To date"
            />
          </div>
          <select value={direction} onChange={e => setDirection(e.target.value)} className="form-input">
            <option value="all">All Directions</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
          <select value={pnlFilter} onChange={e => setPnlFilter(e.target.value)} className="form-input">
            <option value="all">All P&L</option>
            <option value="profit">Profitable</option>
            <option value="loss">Losing</option>
          </select>
        </div>
        <button onClick={applyFilters} className="btn-primary py-2 px-5 text-sm">
          Apply Filters
        </button>
      </div>

      {/* Table */}
      <div className="card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-accent" size={28} />
          </div>
        ) : trades.length === 0 ? (
          <div className="py-14 text-center">
            <BarChart3 size={32} className="text-text-muted mx-auto mb-3" strokeWidth={1.3} />
            <p className="text-text-muted text-sm">No trades found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="font-mono text-xs tracking-widest text-text-muted uppercase border-b border-border bg-bg-elevated">
                  <th className="text-left p-4">User</th>
                  <th className="text-left p-4 w-28">Date</th>
                  <th className="text-left p-4">Symbol</th>
                  <th className="text-left p-4 w-20">Dir</th>
                  <th className="text-right p-4 w-24">Entry</th>
                  <th className="text-right p-4 w-24">Exit</th>
                  <th className="text-right p-4 w-28">P&L</th>
                  <th className="text-left p-4 hidden lg:table-cell">Tags</th>
                  <th className="text-center p-4 w-20">Screenshot</th>
                </tr>
              </thead>
              <tbody>
                {trades.map(t => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                    <td className="p-4">
                      <div className="text-sm text-text font-medium">{t.profiles?.email ?? '—'}</div>
                      {t.profiles?.full_name && (
                        <div className="font-mono text-xs text-text-muted">{t.profiles.full_name}</div>
                      )}
                    </td>
                    <td className="p-4 font-mono text-xs text-text-muted whitespace-nowrap">
                      {new Date(t.opened_at).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: '2-digit',
                      })}
                    </td>
                    <td className="p-4 font-mono text-sm text-text">{t.symbol}</td>
                    <td className="p-4">
                      <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded-full ${
                        t.direction === 'long'
                          ? 'border-signal-green/30 bg-signal-green/10 text-signal-green'
                          : 'border-signal-red/30 bg-signal-red/10 text-signal-red'
                      }`}>
                        {t.direction}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-sm text-text-muted">
                      ${Number(t.entry_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                    </td>
                    <td className="p-4 text-right font-mono text-sm text-text-muted">
                      {t.exit_price
                        ? `$${Number(t.exit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}`
                        : '—'}
                    </td>
                    <td className={`p-4 text-right font-mono text-sm font-bold tabular whitespace-nowrap ${
                      t.pnl == null ? 'text-text-muted' : Number(t.pnl) >= 0 ? 'text-signal-green' : 'text-signal-red'
                    }`}>
                      {t.pnl != null
                        ? `${Number(t.pnl) >= 0 ? '+' : ''}$${Number(t.pnl).toFixed(2)}`
                        : '—'}
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {t.strategy && (
                          <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-border rounded text-text-muted">
                            {t.strategy}
                          </span>
                        )}
                        {t.emotion && (
                          <span className={`font-mono text-[10px] uppercase tracking-wider ${
                            POSITIVE_EMOTIONS.includes(t.emotion) ? 'text-signal-green' : 'text-signal-red'
                          }`}>
                            {t.emotion}
                          </span>
                        )}
                        {t.mistakes && t.mistakes.length > 0 && (
                          <span className="font-mono text-[10px] uppercase tracking-wider text-signal-red border border-signal-red/20 px-1.5 py-0.5 rounded">
                            {t.mistakes[0]}{t.mistakes.length > 1 ? ` +${t.mistakes.length - 1}` : ''}
                          </span>
                        )}
                        {t.broker && (
                          <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                            {t.broker}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {t.screenshot_url ? (
                        <img
                          src={t.screenshot_url}
                          alt="Screenshot"
                          className="w-10 h-10 rounded object-cover border border-border cursor-pointer hover:border-accent/50 transition-colors mx-auto"
                          onClick={() => setLightboxSrc(t.screenshot_url!)}
                        />
                      ) : (
                        <span className="text-text-dim text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="btn-secondary py-2 px-4 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="font-mono text-sm text-text-muted">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page >= pages || loading}
            className="btn-secondary py-2 px-4 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
