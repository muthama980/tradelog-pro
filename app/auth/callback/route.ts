import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Allow ?next= only for internal auth paths (e.g. password reset)
      const safePath = next.startsWith('/auth/') ? next : '/dashboard';
      return NextResponse.redirect(new URL(safePath, 'https://tradelogpro.xyz'));
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth-failed', 'https://tradelogpro.xyz'));
}
