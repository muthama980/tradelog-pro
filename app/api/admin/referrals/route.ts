import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function assertAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  return profile?.is_admin ? user : null;
}

export async function GET() {
  const supabase = createClient();
  if (!await assertAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [{ data: links }, { data: referrals }, { data: payouts }] = await Promise.all([
    supabase.from('referral_links').select('*').order('created_at', { ascending: false }),
    supabase.from('referrals').select('*'),
    supabase.from('referral_payouts').select('*'),
  ]);

  const linkList     = links     || [];
  const referralList = referrals || [];
  const payoutList   = payouts   || [];

  // Fetch referrer profiles
  const referrerIds = [...new Set(linkList.map(l => l.user_id))];
  const { data: profiles } = referrerIds.length
    ? await supabase.from('profiles').select('id, email, full_name').in('id', referrerIds)
    : { data: [] };

  const profileMap: Record<string, { email: string; full_name: string | null }> = {};
  (profiles || []).forEach(p => { profileMap[p.id] = p; });

  // Enrich links with stats
  const enrichedLinks = linkList.map(link => {
    const linked        = referralList.filter(r => r.referral_link_id === link.id);
    const subscribed    = linked.filter(r => r.status === 'subscribed');
    const totalEarned   = subscribed.reduce((s, r) => s + Number(r.commission_amount || 0), 0);
    const totalCommPaid = subscribed.reduce((s, r) => s + Number(r.commission_paid   || 0), 0);
    return {
      ...link,
      referrer_email:   profileMap[link.user_id]?.email    ?? null,
      referrer_name:    profileMap[link.user_id]?.full_name ?? null,
      signup_count:     linked.length,
      subscriber_count: subscribed.length,
      total_earned:     totalEarned,
      total_comm_paid:  totalCommPaid,
    };
  });

  // Overview
  const allSubscribed   = referralList.filter(r => r.status === 'subscribed');
  const allOnTrial      = referralList.filter(r => r.status === 'signed_up');
  const totalOwed       = allSubscribed.reduce((s, r) => s + Number(r.commission_amount || 0) - Number(r.commission_paid || 0), 0);
  const totalPaid       = payoutList.reduce((s, p) => s + Number(p.amount || 0), 0);

  return NextResponse.json({
    links: enrichedLinks,
    overview: {
      partnerLinks:    linkList.filter(l => l.type === 'partner').length,
      userLinks:       linkList.filter(l => l.type === 'user').length,
      totalReferred:   referralList.length,
      onTrial:         allOnTrial.length,
      totalSubscribed: allSubscribed.length,
      totalOwed:       Math.max(0, totalOwed),
      totalPaid,
    },
  });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const admin = await assertAdmin(supabase);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { label, code, commission_rate, user_id } = await req.json();
  if (!code || !label) return NextResponse.json({ error: 'Missing code or label' }, { status: 400 });

  // Resolve user_id: if not provided, use admin's own id as placeholder
  const ownerId = user_id || admin.id;
  const rate    = typeof commission_rate === 'number' ? commission_rate / 100 : 0.36;

  const { data: link, error } = await supabase
    .from('referral_links')
    .insert({ user_id: ownerId, code: code.toLowerCase().trim(), type: 'partner', commission_rate: rate, label })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Code already in use' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ link });
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  if (!await assertAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Only allow safe fields
  const allowed: Record<string, unknown> = {};
  if (updates.is_active !== undefined)      allowed.is_active       = updates.is_active;
  if (updates.commission_rate !== undefined) allowed.commission_rate = updates.commission_rate;
  if (updates.label !== undefined)          allowed.label           = updates.label;
  if (updates.code !== undefined)           allowed.code            = updates.code;

  const { error } = await supabase.from('referral_links').update(allowed).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  if (!await assertAdmin(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('referral_links').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
