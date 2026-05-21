import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  // Look up the referral link
  const { data: link } = await supabase
    .from('referral_links')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single();

  if (!link) return NextResponse.json({ error: 'Invalid or inactive code' }, { status: 404 });

  // Don't allow self-referral
  if (link.user_id === user.id) return NextResponse.json({ ok: true, skipped: 'self-referral' });

  // Check if this user was already referred
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_id', user.id)
    .single();

  if (existing) return NextResponse.json({ ok: true, skipped: 'already-referred' });

  // Increment click count atomically
  await supabase.rpc('increment_referral_clicks', { link_id: link.id });

  // Create referral record
  await supabase.from('referrals').insert({
    referral_link_id: link.id,
    referrer_id:      link.user_id,
    referred_id:      user.id,
    status:           'signed_up',
  });

  // Update profile with referral code
  await supabase
    .from('profiles')
    .update({ referred_by: code })
    .eq('id', user.id);

  return NextResponse.json({ ok: true });
}
