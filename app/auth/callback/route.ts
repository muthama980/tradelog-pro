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
      // Save email_opt_in preference from signup metadata to profile
      if (data?.user) {
        const optIn = data.user.user_metadata?.email_opt_in;
        if (optIn !== undefined) {
          await supabase
            .from('profiles')
            .update({ email_opt_in: Boolean(optIn) })
            .eq('id', data.user.id);
        }
      }
      const safePath = next.startsWith('/auth/') ? next : '/dashboard';
      return NextResponse.redirect(new URL(safePath, 'https://tradelogpro.xyz'));
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth-failed', 'https://tradelogpro.xyz'));
}
