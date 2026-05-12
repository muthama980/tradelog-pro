import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Save metadata from signup (email_opt_in, plan_intent) to profile
      if (data?.user) {
        const updates: Record<string, unknown> = {};
        const optIn = data.user.user_metadata?.email_opt_in;
        if (optIn !== undefined) updates.email_opt_in = Boolean(optIn);
        const planIntent = data.user.user_metadata?.plan_intent;
        if (planIntent) updates.plan_intent = planIntent;
        if (Object.keys(updates).length > 0) {
          await supabase.from('profiles').update(updates).eq('id', data.user.id);
        }
      }
      const safePath = next.startsWith('/auth/') ? next : '/dashboard';
      return NextResponse.redirect(new URL(safePath, 'https://tradelogpro.xyz'));
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth-failed', 'https://tradelogpro.xyz'));
}
