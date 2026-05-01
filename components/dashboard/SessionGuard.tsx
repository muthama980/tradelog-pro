'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SessionGuard() {
  const router = useRouter();

  useEffect(() => {
    const remember = localStorage.getItem('tlp_remember');
    const sessionActive = sessionStorage.getItem('tlp_session_active');

    if (!remember && !sessionActive) {
      const supabase = createClient();
      supabase.auth.signOut().then(() => {
        router.push('/login');
      });
    }
  }, []);

  return null;
}
