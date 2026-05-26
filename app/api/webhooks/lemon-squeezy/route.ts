import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Use service role key so we can write to profiles regardless of RLS
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'webhook secret missing' }, { status: 500 });

  const raw = await req.text();
  const sig = req.headers.get('x-signature') || '';

  // Verify signature
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(raw).digest('hex');
  if (digest !== sig) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(raw);
  const eventName = event?.meta?.event_name;
  const customData = event?.meta?.custom_data || {};
  const userId = customData.user_id;
  const plan = customData.plan;

  if (!userId) return NextResponse.json({ ok: true });

  const supabase = adminClient();
  const subscription = event?.data?.attributes;

  if (eventName === 'subscription_created' || eventName === 'subscription_resumed') {
    await supabase.from('profiles').update({
      plan: plan || 'pro',
      subscribed_at: new Date().toISOString(),
      ls_customer_id:    String(subscription?.customer_id || ''),
      ls_subscription_id: String(event?.data?.id || ''),
      trial_ends_at: null,
    }).eq('id', userId);

    // Referral commission tracking
    try {
      const userEmail = subscription?.user_email;
      if (userEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, referred_by')
          .eq('email', userEmail)
          .single();

        if (profile?.referred_by) {
          const { data: link } = await supabase
            .from('referral_links')
            .select('id, user_id, commission_rate')
            .eq('code', profile.referred_by)
            .single();

          if (link) {
            const PLAN_PRICES: Record<string, number> = { core: 19, pro: 25, prop: 40 };
            const planName = (plan || 'pro').toLowerCase();
            const basePrice = PLAN_PRICES[planName] ?? 19;
            const commissionAmount = basePrice * link.commission_rate;

            await supabase
              .from('referrals')
              .update({
                status: 'subscribed',
                plan: planName,
                subscription_amount: basePrice,
                commission_amount: commissionAmount,
                subscribed_at: new Date().toISOString(),
              })
              .eq('referred_id', profile.id)
              .eq('referral_link_id', link.id);
          }
        }
      }
    } catch (err) {
      console.error('[webhook] referral commission tracking error:', err);
    }
  } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
    await supabase.from('profiles').update({ plan: 'cancelled' }).eq('id', userId);

    // Referral churn tracking
    try {
      const userEmail = subscription?.user_email;
      if (userEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, referred_by')
          .eq('email', userEmail)
          .single();

        if (profile?.referred_by) {
          const { data: link } = await supabase
            .from('referral_links')
            .select('id')
            .eq('code', profile.referred_by)
            .single();

          if (link) {
            await supabase
              .from('referrals')
              .update({ status: 'churned' })
              .eq('referred_id', profile.id)
              .eq('referral_link_id', link.id);
          }
        }
      }
    } catch (err) {
      console.error('[webhook] referral churn tracking error:', err);
    }
  }

  return NextResponse.json({ ok: true });
}
