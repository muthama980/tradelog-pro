'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import DashboardSidebar from '@/components/dashboard/Sidebar';
import SessionGuard from '@/components/dashboard/SessionGuard';
import NotificationBell from '@/components/dashboard/NotificationBell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/login');
    });
  }, []);

  return (
    <div className="min-h-screen flex bg-bg">
      <SessionGuard />
      <DashboardSidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 h-12 border-b border-border bg-bg-surface/80 backdrop-blur-sm flex items-center px-4 gap-3">
          <button
            className="lg:hidden p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-bg-elevated transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} strokeWidth={1.7} />
          </button>
          <div className="flex-1" />
          <NotificationBell />
        </div>
        {children}
      </main>
    </div>
  );
}
