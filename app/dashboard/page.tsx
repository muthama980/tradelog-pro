import { createClient } from '@/lib/supabase/server';
import { TrendingUp, TrendingDown, Plus, BookOpen, Star, Trophy, CheckCircle2, Circle, ArrowRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import DailyQuote from '@/components/DailyQuote';
import OverviewChart from '@/components/dashboard/OverviewChart';
import RiskStatus from '@/components/dashboard/RiskStatus';
import UpgradeButton from '@/components/dashboard/UpgradeButton';

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
    .order('opened_at', { ascending: false });

  const { data: connections } = await supabase
    .from('exchange_connections')
    .select('id')
    .eq('user_id', user!.id)
    .limit(1);

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

  const planIntent: string = profile?.plan_intent || 'pro';

  const displayName =
    profile?.full_name ||
    user!.user_metadata?.full_name ||
    user!.user_metadata?.name ||
    user!.email ||
    'Trader';
  const firstName = displayName.split(' ')[0];

  const plan = profile?.plan || 'trial';
  const hasTrades = (trades || []).length > 0;
  const hasConnection = (connections || []).length > 0;

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
            <PlanBadge plan={plan} trialDays={trialDays} planIntent={planIntent} />
            {(plan === 'trial' || plan === 'cancelled') && (
              <UpgradeButton
                className="font-mono text-[11px] tracking-widest text-accent uppercase hover:underline underline-offset-4 transition"
                label="Upgrade →"
              />
            )}
          </div>
        </div>
        <Link href="/dashboard/journal" className="btn-primary">
          <Plus size={15} className="mr-2" />
          Log Trade
        </Link>
      </div>

      {/* Trial expiry warning banner */}
      {plan === 'trial' && trialDays <= 1 && (
        <div className={`mb-6 flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl border ${
          trialDays === 0
            ? 'border-signal-red/40 bg-signal-red/5'
            : 'border-amber-500/30 bg-amber-500/5'
        }`}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={15} className={trialDays === 0 ? 'text-signal-red shrink-0' : 'text-amber-400 shrink-0'} />
            <p className={`text-sm ${trialDays === 0 ? 'text-signal-red' : 'text-amber-400'}`}>
              {trialDays === 0
                ? 'Your free trial ends today.'
                : 'Your free trial ends tomorrow.'}
              {' '}Upgrade now to keep your data and access.
            </p>
          </div>
          <UpgradeButton
            className="shrink-0 font-mono text-[11px] tracking-widest uppercase text-accent hover:underline underline-offset-4 transition whitespace-nowrap"
            label="Upgrade →"
          />
        </div>
      )}

      {/* Getting Started card */}
      {!(hasTrades && hasConnection) && (
        <GettingStartedCard hasTrades={hasTrades} hasConnection={hasConnection} />
      )}

      {/* Daily risk status */}
      <RiskStatus />

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
              {closed.length === 0 ? 'No trades yet' : `${closed.length} closed trades`}
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
            <span className="font-mono text-[10px] tracking-widest text-accent uppercase">All time</span>
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
                <th className="text-left p-3">Symbol</th>
                <th className="text-left p-3 hidden md:table-cell">Strategy</th>
                <th className="text-left p-3 hidden lg:table-cell">Direction</th>
                <th className="text-left p-3 hidden lg:table-cell">Date</th>
                <th className="text-right p-3">P&L</th>
                <th className="text-right p-3 w-px">Status</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(0, 8).map((t: any) => (
                <tr key={t.id} className="border-t border-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="p-3 font-mono text-sm text-text">{t.symbol}</td>
                  <td className="p-3 hidden md:table-cell">
                    {t.strategy && (
                      <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim px-2 py-0.5 border border-border rounded">
                        {t.strategy}
                      </span>
                    )}
                  </td>
                  <td className="p-3 hidden lg:table-cell text-sm text-text-muted capitalize">{t.direction}</td>
                  <td className="p-3 hidden lg:table-cell font-mono text-xs text-text-dim">
                    {new Date(t.opened_at).toLocaleDateString()}
                  </td>
                  <td className={`p-3 text-right font-mono text-sm tabular font-bold whitespace-nowrap ${Number(t.pnl) >= 0 ? 'text-signal-green' : 'text-signal-red'}`}>
                    {t.pnl != null ? `${Number(t.pnl) >= 0 ? '+' : ''}$${Number(t.pnl).toFixed(2)}` : '—'}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap w-px">
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

function GettingStartedCard({ hasTrades, hasConnection }: { hasTrades: boolean; hasConnection: boolean }) {
  const steps = [
    {
      num: 1,
      title: 'Log your first trade',
      desc: 'Record your first trade to start tracking performance.',
      href: '/dashboard/journal',
      done: hasTrades,
    },
    {
      num: 2,
      title: 'Connect an exchange',
      desc: 'Auto-sync trades from Binance, Coinbase, Kraken, or OKX.',
      href: '/dashboard/connections',
      done: hasConnection,
    },
    {
      num: 3,
      title: 'Check your analytics',
      desc: 'See your win rate, P&L curve, and key metrics.',
      href: '/dashboard/analytics',
      done: hasTrades,
    },
    {
      num: 4,
      title: 'Explore AI Coach',
      desc: 'Get intelligent pattern analysis on your trades.',
      href: '/dashboard/coach',
      done: false,
    },
  ];

  return (
    <div className="card rounded-xl p-6 mb-8 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-base text-text">Getting Started</h3>
        <span className="font-mono text-[10px] tracking-widest text-text-dim uppercase">
          {steps.filter(s => s.done).length}/{steps.length} complete
        </span>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {steps.map(step => (
          <Link
            key={step.num}
            href={step.href}
            className={`group flex items-start gap-3 p-4 rounded-lg border transition-colors ${
              step.done
                ? 'border-signal-green/20 bg-signal-green/5'
                : 'border-border hover:border-accent/30 hover:bg-bg-elevated'
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              step.done ? 'text-signal-green' : 'border border-border text-text-dim'
            }`}>
              {step.done
                ? <CheckCircle2 size={18} strokeWidth={1.7} />
                : <span className="font-mono text-[11px]">{step.num}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold mb-0.5 ${step.done ? 'text-text-muted line-through' : 'text-text'}`}>
                {step.title}
              </p>
              <p className="text-xs text-text-dim leading-relaxed">{step.desc}</p>
            </div>
            {!step.done && (
              <ArrowRight size={14} className="text-text-dim group-hover:text-accent shrink-0 mt-1 transition-colors" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

function PlanBadge({ plan, trialDays, planIntent }: { plan: string; trialDays: number; planIntent?: string }) {
  if (plan === 'trial') {
    const isUrgent  = trialDays === 0;
    const isWarning = trialDays === 1;
    const tier = (planIntent === 'core' ? 'Core' : 'Pro').toUpperCase();
    const label = isUrgent
      ? 'TRIAL ENDS TODAY'
      : `FREE TRIAL · ${tier} · ${trialDays}d left`;
    const cls = isUrgent
      ? 'border-signal-red/40 bg-signal-red/5 text-signal-red'
      : isWarning
      ? 'border-amber-500/30 bg-amber-500/5 text-amber-400'
      : 'border-border bg-bg-elevated text-text-dim';
    return (
      <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full border ${cls}`}>
        {label}
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
        ELITE PLAN
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
