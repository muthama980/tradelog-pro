import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { code, referred_user_id } = await req.json();
  if (!code || !referred_user_id) {
    return NextResponse.json({ error: 'Missing code or referred_user_id' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Look up the referral link
  const { data: link } = await supabase
    .from('referral_links')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single();

  if (!link) return NextResponse.json({ error: 'Invalid or inactive code' }, { status: 404 });

  // Don't allow self-referral
  if (link.user_id === referred_user_id) return NextResponse.json({ ok: true, skipped: 'self-referral' });

  // Check if this user was already referred
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_id', referred_user_id)
    .single();

  if (existing) return NextResponse.json({ ok: true, skipped: 'already-referred' });

  // Increment click count atomically
  await supabase.rpc('increment_referral_clicks', { link_id: link.id });

  // Create referral record
  await supabase.from('referrals').insert({
    referral_link_id: link.id,
    referrer_id:      link.user_id,
    referred_id:      referred_user_id,
    status:           'signed_up',
  });

  // Extend trial to 8 days and update referral code on profile
  const extendedTrial = new Date();
  extendedTrial.setDate(extendedTrial.getDate() + 8);
  await supabase
    .from('profiles')
    .update({ referred_by: code, trial_ends_at: extendedTrial.toISOString() })
    .eq('id', referred_user_id);

  return NextResponse.json({ ok: true });
}
