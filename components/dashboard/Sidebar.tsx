'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, BookOpen, BarChart3, Brain, Settings, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/dashboard',           label: 'Overview',  icon: LayoutDashboard },
  { href: '/dashboard/journal',   label: 'Journal',   icon: BookOpen },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/coach',               label: 'AI Coach',  icon: Brain },
];

const PLAN_LABELS: Record<string, string> = {
  trial:     'Free Trial',
  core:      'Core Plan',
  pro:       'Pro Plan',
  prop:      'Prop Trader',
  cancelled: 'Plan Expired',
};

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlan() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
      if (data?.plan) setPlan(data.plan);
    }
    fetchPlan();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-bg-surface flex flex-col">
      <div className="p-5 border-b border-border">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-accent rounded-[3px] flex items-center justify-center">
            <span className="font-mono text-[9px] font-black text-bg tracking-[-0.05em]">TLP</span>
          </div>
          <span className="font-bold text-sm text-text">TradeLog<span className="text-accent">Pro</span></span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-accent/10 text-accent border-l-2 border-accent'
                  : 'text-text-muted hover:text-text hover:bg-bg-elevated'
              }`}
            >
              <Icon size={15} strokeWidth={1.7} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-0.5">
        {plan && (
          <div className="px-3 py-2 mb-1">
            <span className={`font-mono text-[10px] tracking-widest uppercase ${
              plan === 'cancelled' ? 'text-signal-red' : plan === 'trial' ? 'text-text-dim' : 'text-accent'
            }`}>
              {PLAN_LABELS[plan] ?? plan}
            </span>
          </div>
        )}
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-text hover:bg-bg-elevated transition-colors"
        >
          <Settings size={15} strokeWidth={1.7} />
          Settings
        </Link>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-signal-red hover:bg-bg-elevated transition-colors"
        >
          <LogOut size={15} strokeWidth={1.7} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
