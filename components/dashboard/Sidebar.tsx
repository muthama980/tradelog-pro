'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, BookOpen, BarChart3, Brain, Plug, Settings, LogOut, X, Flag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const NAV = [
  { href: '/dashboard',           label: 'Overview',  icon: LayoutDashboard },
  { href: '/dashboard/journal',   label: 'Journal',   icon: BookOpen },
  { href: '/dashboard/connections', label: 'Connections', icon: Plug },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/coach',     label: 'AI Coach',  icon: Brain },
];

const PLAN_LABELS: Record<string, string> = {
  trial:     'Free Trial',
  core:      'Core Plan',
  pro:       'Pro Plan',
  prop:      'Prop Trader',
  cancelled: 'Plan Expired',
};

export default function DashboardSidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('plan').eq('id', user.id).single().then(({ data }) => {
        if (data?.plan) setPlan(data.plan);
      });
    });
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const sidebarContent = (
    <aside className="w-60 h-full bg-bg-surface flex flex-col border-r border-border">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-accent rounded-[3px] flex items-center justify-center">
            <span className="font-mono text-[9px] font-black text-bg tracking-[-0.05em]">TLP</span>
          </div>
          <span className="font-bold text-sm text-text">TradeLog<span className="text-accent">Pro</span></span>
        </Link>
        {/* X button — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-bg-elevated transition-colors"
          aria-label="Close menu"
        >
          <X size={18} strokeWidth={1.7} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {NAV.map((item) => {
          const Icon   = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-accent/10 text-accent border-l-2 border-accent'
                  : 'text-text-muted hover:text-text hover:bg-bg-elevated'
              }`}
            >
              <Icon size={15} strokeWidth={1.7} />
              <span className="flex-1">{item.label}</span>
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
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            pathname === '/dashboard/settings'
              ? 'bg-accent/10 text-accent border-l-2 border-accent'
              : 'text-text-muted hover:text-text hover:bg-bg-elevated'
          }`}
        >
          <Settings size={15} strokeWidth={1.7} />
          Settings
        </Link>
        <Link
          href="/dashboard/feedback"
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            pathname === '/dashboard/feedback'
              ? 'bg-accent/10 text-accent border-l-2 border-accent'
              : 'text-text-muted hover:text-text hover:bg-bg-elevated'
          }`}
        >
          <Flag size={15} strokeWidth={1.7} />
          Report Issue
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

  return (
    <>
      {/* Desktop: static sidebar, always visible */}
      <div className="hidden lg:flex h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile: fixed overlay with backdrop, slide in from left */}
      <div className="lg:hidden">
        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
        {/* Sidebar panel */}
        <div
          className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
