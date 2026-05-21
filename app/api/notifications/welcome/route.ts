import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createWelcomeNotifications } from '@/lib/notifications';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single();

  const email = profile?.email ?? user.email ?? '';
  const fullName = profile?.full_name ?? '';
  const firstName = fullName.split(' ')[0] || email.split('@')[0] || 'Trader';

  await Promise.all([
    createWelcomeNotifications(user.id),
    sendWelcomeEmail(email, firstName),
  ]);

  return NextResponse.json({ ok: true });
}
