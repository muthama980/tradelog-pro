import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data?.user) {
        const updates: Record<string, unknown> = {};
        const optIn = data.user.user_metadata?.email_opt_in;
        if (optIn !== undefined) updates.email_opt_in = Boolean(optIn);
        const planIntent = data.user.user_metadata?.plan_intent;
        if (planIntent) updates.plan_intent = planIntent;
        if (Object.keys(updates).length > 0) {
          await supabase.from('profiles').update(updates).eq('id', data.user.id);
        }

        // Track referral signup if a ref cookie is present
        const refCode = request.cookies.get('tradelog_ref')?.value;
        if (refCode) {
          const admin = createAdminClient();
          const { data: link } = await admin
            .from('referral_links')
            .select('id, user_id')
            .eq('code', refCode)
            .eq('is_active', true)
            .single();

          if (link && link.user_id !== data.user.id) {
            const { data: existing } = await admin
              .from('referrals')
              .select('id')
              .eq('referred_id', data.user.id)
              .single();

            if (!existing) {
              await admin.rpc('increment_referral_clicks', { link_id: link.id });
              await admin.from('referrals').insert({
                referral_link_id: link.id,
                referrer_id:      link.user_id,
                referred_id:      data.user.id,
                status:           'signed_up',
              });
              await admin
                .from('profiles')
                .update({ referred_by: refCode })
                .eq('id', data.user.id);
            }
          }

          // Clear ref cookie
          const response = NextResponse.redirect(new URL('/dashboard', 'https://tradelogpro.xyz'));
          response.cookies.set('tradelog_ref', '', { path: '/', maxAge: 0 });
          return response;
        }
      }

      const safePath = next.startsWith('/auth/') ? next : '/dashboard';
      return NextResponse.redirect(new URL(safePath, 'https://tradelogpro.xyz'));
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth-failed', 'https://tradelogpro.xyz'));
}
