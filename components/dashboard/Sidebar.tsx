'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, BookOpen, BarChart3, Brain, Plug, Settings, LogOut, X, Flag, HelpCircle, Library, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const NAV = [
  { href: '/dashboard',             label: 'Overview',     icon: LayoutDashboard, tour: 'overview' },
  { href: '/dashboard/journal',     label: 'Journal',      icon: BookOpen,        tour: 'journal' },
  { href: '/dashboard/playbook',    label: 'Playbook',     icon: Library,         tour: 'playbook' },
  { href: '/dashboard/connections', label: 'Connections',  icon: Plug,            tour: 'connections' },
  { href: '/dashboard/analytics',   label: 'Analytics',    icon: BarChart3,       tour: 'analytics' },
  { href: '/dashboard/coach',       label: 'AI Coach',     icon: Brain,           tour: 'coach' },
];

const PLAN_LABELS: Record<string, string> = {
  trial:     'Free Trial',
  core:      'Core Plan',
  pro:       'Pro Plan',
  prop:      'Elite Plan',
  cancelled: 'Plan Expired',
};

export default function DashboardSidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [plan, setPlan] = useState<string | null>(null);
  const [planIntent, setPlanIntent] = useState<string>('pro');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('plan, plan_intent, is_admin').eq('id', user.id).single().then(({ data, error }) => {
        console.log('Profile data:', data, 'Error:', error);
        if (data?.plan) setPlan(data.plan);
        if (data?.plan_intent) setPlanIntent(data.plan_intent);
        if (data?.is_admin) setIsAdmin(true);
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

      <nav className="flex-1 px-3 py-5 space-y-0.5" data-tour="sidebar">
        {NAV.map((item) => {
          const Icon   = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              data-tour={item.tour}
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
              plan === 'cancelled' ? 'text-signal-red' : plan === 'trial' ? 'text-text-muted' : 'text-accent'
            }`}>
              {plan === 'trial'
                ? `Trial · ${planIntent === 'core' ? 'Core' : 'Pro'}`
                : (PLAN_LABELS[plan] ?? plan)}
            </span>
          </div>
        )}
        <Link
          href="/dashboard/help"
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            pathname === '/dashboard/help'
              ? 'bg-accent/10 text-accent border-l-2 border-accent'
              : 'text-text-muted hover:text-text hover:bg-bg-elevated'
          }`}
        >
          <HelpCircle size={15} strokeWidth={1.7} />
          Help
        </Link>
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
        {isAdmin && (
          <Link
            href="/dashboard/admin/notifications"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              pathname.startsWith('/dashboard/admin')
                ? 'bg-accent/10 text-accent border-l-2 border-accent'
                : 'text-text-muted hover:text-text hover:bg-bg-elevated'
            }`}
          >
            <Shield size={15} strokeWidth={1.7} />
            Admin
          </Link>
        )}
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
