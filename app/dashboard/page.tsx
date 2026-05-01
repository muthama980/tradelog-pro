import { createClient } from '@/lib/supabase/server';
import { TrendingUp, TrendingDown, Plus, BookOpen, Star, Trophy } from 'lucide-react';
import Link from 'next/link';
import DailyQuote from '@/components/DailyQuote';
import OverviewChart from '@/components/dashboard/OverviewChart';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single();

  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user!.id)
    .order('opened_at', { ascending: false })
    .limit(50);

  const closed   = (trades || []).filter((t: any) => t.status === 'closed');
  const wins     = closed.filter((t: any) => Number(t.pnl) > 0);
  const totalPnl = closed.reduce((s: number, t: any) => s + Number(t.pnl || 0), 0);
  const winRate  = closed.length ? (wins.length / closed.length) * 100 : 0;
  const avgR     = closed.length
    ? closed.reduce((s: number, t: any) => s + Number(t.r_multiple || 0), 0) / closed.length
    : 0;

  const trialDays = profile?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  const displayName =
    profile?.full_name ||
    user!.user_metadata?.full_name ||
    user!.user_metadata?.name ||
    user!.email ||
    'Trader';
  const firstName = displayName.split(' ')[0];

  const plan = profile?.plan || 'trial';

  return (
    <div className="p-8 md:p-10 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-6 mb-8">
        <div>
          <p className="mono-label mb-2">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-text tracking-tight">
              Welcome back, <span className="text-accent">{firstName}</span>.
            </h1>
            <PlanBadge plan={plan} trialDays={trialDays} />
          </div>
          {plan === 'trial' && (
            <Link
              href="/pricing"
              className="mt-2 inline-block font-mono text-[11px] tracking-widest text-accent uppercase hover:underline underline-offset-4 transition"
            >
              Upgrade now →
            </Link>
          )}
        </div>
        <Link href="/dashboard/journal" className="btn-primary">
          <Plus size={15} className="mr-2" />
          Log Trade
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total P&L',     val: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, up: totalPnl >= 0 },
          { label: 'Win Rate',      val: `${winRate.toFixed(1)}%`,  up: winRate >= 50 },
          { label: 'Avg R',         val: `${avgR.toFixed(2)}R`,     up: avgR >= 0 },
          { label: 'Trades Closed', val: `${closed.length}`,        up: true },
        ].map((k) => (
          <div key={k.label} className="card rounded-xl p-5">
            <div className="mono-label mb-3">{k.label}</div>
            <div className="font-mono text-2xl font-bold text-text tabular">{k.val}</div>
            <div className={`mt-2 font-mono text-xs flex items-center gap-1 ${k.up ? 'text-signal-green' : 'text-signal-red'}`}>
              {k.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {closed.length === 0 ? 'No trades yet' : 'Last 50 trades'}
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Quote */}
      <div className="grid lg:grid-cols-3 gap-5 mb-8">
        <div className="lg:col-span-2 card rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-base text-text">P&L Curve</h3>
              <p className="mono-label mt-0.5">Cumulative profit & loss</p>
            </div>
            <span className="font-mono text-[10px] tracking-widest text-accent uppercase">30d</span>
          </div>
          <OverviewChart trades={closed} />
        </div>
        <div>
          <DailyQuote variant="compact" />
        </div>
      </div>

      {/* Recent trades */}
      <div className="card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-base text-text">Recent Trades</h3>
          <Link href="/dashboard/journal" className="font-mono text-[11px] tracking-widest text-accent hover:text-accent-glow uppercase transition">
            View all →
          </Link>
        </div>

        {(!trades || trades.length === 0) ? (
          <div className="p-12 text-center">
            <BookOpen className="text-text-dim mx-auto mb-4" size={36} strokeWidth={1.5} />
            <h4 className="font-bold text-xl text-text mb-2">No trades yet</h4>
            <p className="text-text-muted mb-6 max-w-sm mx-auto text-sm">
              Log your first trade. The journey of a thousand pips begins with a single entry.
            </p>
            <Link href="/dashboard/journal" className="btn-primary">
              <Plus size={15} className="mr-2" /> Log your first trade
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="font-mono text-[10px] tracking-widest text-text-dim uppercase bg-bg-elevated">
                <th className="text-left p-4">Symbol</th>
                <th className="text-left p-4 hidden md:table-cell">Strategy</th>
                <th className="text-left p-4 hidden md:table-cell">Direction</th>
                <th className="text-left p-4 hidden lg:table-cell">Date</th>
                <th className="text-right p-4">P&L</th>
                <th className="text-right p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(0, 8).map((t: any) => (
                <tr key={t.id} className="border-t border-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="p-4 font-mono text-sm text-text">{t.symbol}</td>
                  <td className="p-4 hidden md:table-cell">
                    {t.strategy && (
                      <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim px-2 py-0.5 border border-border rounded">
                        {t.strategy}
                      </span>
                    )}
                  </td>
                  <td className="p-4 hidden md:table-cell text-sm text-text-muted capitalize">{t.direction}</td>
                  <td className="p-4 hidden lg:table-cell font-mono text-xs text-text-dim">
                    {new Date(t.opened_at).toLocaleDateString()}
                  </td>
                  <td className={`p-4 text-right font-mono text-sm tabular font-bold ${Number(t.pnl) >= 0 ? 'text-signal-green' : 'text-signal-red'}`}>
                    {t.pnl != null ? `${Number(t.pnl) >= 0 ? '+' : ''}$${Number(t.pnl).toFixed(2)}` : '—'}
                  </td>
                  <td className="p-4 text-right">
                    <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border rounded ${
                      t.status === 'open' ? 'border-accent/40 text-accent' : 'border-border text-text-dim'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PlanBadge({ plan, trialDays }: { plan: string; trialDays: number }) {
  if (plan === 'trial') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full border border-border bg-bg-elevated text-text-dim">
        FREE TRIAL · {trialDays}d left
      </span>
    );
  }
  if (plan === 'core') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full border border-accent/40 text-accent">
        CORE PLAN
      </span>
    );
  }
  if (plan === 'pro') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full bg-accent text-bg font-bold">
        <Star size={10} fill="currentColor" strokeWidth={0} />
        PRO PLAN
      </span>
    );
  }
  if (plan === 'prop') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full text-bg font-bold"
        style={{ background: 'linear-gradient(135deg, #00D9FF 0%, #0099CC 100%)' }}>
        <Trophy size={10} fill="currentColor" strokeWidth={0} />
        PROP TRADER
      </span>
    );
  }
  if (plan === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full border border-signal-red/40 text-signal-red">
        PLAN EXPIRED
      </span>
    );
  }
  return null;
}
