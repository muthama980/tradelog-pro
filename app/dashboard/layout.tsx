'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import DashboardSidebar from '@/components/dashboard/Sidebar';
import SessionGuard from '@/components/dashboard/SessionGuard';

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
      <main className="flex-1 overflow-y-auto relative">
        <button
          className="lg:hidden absolute top-4 left-4 z-20 p-2 rounded-lg bg-bg-surface border border-border text-text-muted hover:text-text transition-colors"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} strokeWidth={1.7} />
        </button>
        {children}
      </main>
    </div>
  );
}
