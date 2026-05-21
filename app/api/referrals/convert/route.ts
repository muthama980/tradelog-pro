import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const PLAN_PRICES: Record<string, number> = {
  core: 19,
  pro:  25,
  prop: 40,
};

export async function POST(req: NextRequest) {
  const supabase = createClient();

  const body = await req.json();
  const { user_id, plan, amount } = body as { user_id?: string; plan?: string; amount?: number };

  if (!user_id || !plan) return NextResponse.json({ error: 'Missing user_id or plan' }, { status: 400 });

  // Verify caller is admin or the user themselves
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.id !== user_id) {
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Find referral record for this user
  const { data: referral } = await supabase
    .from('referrals')
    .select('*, referral_links(commission_rate)')
    .eq('referred_id', user_id)
    .single();

  if (!referral) return NextResponse.json({ ok: true, skipped: 'no-referral' });

  const subscriptionAmount = amount ?? PLAN_PRICES[plan] ?? 0;
  const commissionRate     = (referral.referral_links as any)?.commission_rate ?? 0.10;
  const commissionAmount   = subscriptionAmount * commissionRate;

  await supabase
    .from('referrals')
    .update({
      status:              'subscribed',
      subscribed_at:       new Date().toISOString(),
      plan,
      subscription_amount: subscriptionAmount,
      commission_amount:   commissionAmount,
    })
    .eq('id', referral.id);

  return NextResponse.json({ ok: true, commissionAmount });
}
