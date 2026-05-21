import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function assertAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  return !!profile?.is_admin;
}

export async function GET() {
  const supabase = createClient();
  if (!await assertAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: payouts } = await supabase
    .from('referral_payouts')
    .select('*')
    .order('paid_at', { ascending: false });

  // Enrich with referrer email
  const referrerIds = [...new Set((payouts || []).map(p => p.referrer_id))];
  const { data: profiles } = referrerIds.length
    ? await supabase.from('profiles').select('id, email, full_name').in('id', referrerIds)
    : { data: [] };

  const profileMap: Record<string, { email: string; full_name: string | null }> = {};
  (profiles || []).forEach(p => { profileMap[p.id] = p; });

  return NextResponse.json(
    (payouts || []).map(p => ({
      ...p,
      referrer_email: profileMap[p.referrer_id]?.email    ?? null,
      referrer_name:  profileMap[p.referrer_id]?.full_name ?? null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  if (!await assertAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { referrer_id, amount, method, reference, notes, referral_ids } = await req.json();
  if (!referrer_id || !amount) return NextResponse.json({ error: 'Missing referrer_id or amount' }, { status: 400 });

  // Record the payout
  const { data: payout, error } = await supabase
    .from('referral_payouts')
    .insert({ referrer_id, amount, method, reference, notes })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark specific referrals as paid (or all subscribed ones if not specified)
  if (referral_ids?.length) {
    for (const rid of referral_ids) {
      const { data: referral } = await supabase
        .from('referrals')
        .select('commission_amount')
        .eq('id', rid)
        .single();
      if (referral) {
        await supabase
          .from('referrals')
          .update({ commission_paid: Number(referral.commission_amount || 0) })
          .eq('id', rid);
      }
    }
  } else {
    // Pay all subscribed referrals for this referrer
    const { data: referrals } = await supabase
      .from('referrals')
      .select('id, commission_amount')
      .eq('referrer_id', referrer_id)
      .eq('status', 'subscribed');

    for (const r of (referrals || [])) {
      await supabase
        .from('referrals')
        .update({ commission_paid: Number(r.commission_amount || 0) })
        .eq('id', r.id);
    }
  }

  return NextResponse.json({ payout });
}
