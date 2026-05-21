import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: link } = await supabase
    .from('referral_links')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', 'user')
    .single();

  if (!link) {
    return NextResponse.json({ link: null, stats: null, referrals: [], payouts: [], pendingEarnings: 0, totalPaid: 0 });
  }

  const [{ data: referrals }, { data: payouts }] = await Promise.all([
    supabase.from('referrals').select('*').eq('referrer_id', user.id).order('signed_up_at', { ascending: false }),
    supabase.from('referral_payouts').select('*').eq('referrer_id', user.id).order('paid_at', { ascending: false }),
  ]);

  const referralList  = referrals || [];
  const payoutList    = payouts  || [];
  const subscribed    = referralList.filter(r => r.status === 'subscribed');
  const totalEarned   = subscribed.reduce((s, r) => s + Number(r.commission_amount || 0), 0);
  const totalPaid     = payoutList.reduce((s, p) => s + Number(p.amount || 0), 0);

  // Fetch referred user profiles for email display
  const referredIds = referralList.map(r => r.referred_id);
  const { data: profiles } = referredIds.length
    ? await supabase.from('profiles').select('id, email, full_name').in('id', referredIds)
    : { data: [] };

  const profileMap: Record<string, { email: string; full_name: string | null }> = {};
  (profiles || []).forEach(p => { profileMap[p.id] = p; });

  const enrichedReferrals = referralList.map(r => ({
    ...r,
    referred_email:    profileMap[r.referred_id]?.email    ?? null,
    referred_name:     profileMap[r.referred_id]?.full_name ?? null,
  }));

  return NextResponse.json({
    link,
    stats: {
      clicks:      link.total_clicks,
      signups:     referralList.length,
      subscribers: subscribed.length,
      totalEarned,
    },
    referrals:       enrichedReferrals,
    payouts:         payoutList,
    pendingEarnings: Math.max(0, totalEarned - totalPaid),
    totalPaid,
  });
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: existing } = await supabase
    .from('referral_links')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', 'user')
    .single();

  if (existing) return NextResponse.json({ error: 'Link already exists' }, { status: 409 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const raw    = (profile?.full_name || user.email || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
  const prefix = raw.slice(0, 4).padEnd(4, 'x');
  const suffix = Math.random().toString(36).slice(2, 6);
  const code   = `${prefix}-${suffix}`;

  const { data: link, error } = await supabase
    .from('referral_links')
    .insert({ user_id: user.id, code, type: 'user', commission_rate: 0.10 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link });
}
