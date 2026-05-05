import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function planFromCode(planCode: string): string | null {
  const map: Record<string, string> = {
    [process.env.PAYSTACK_PLAN_CORE || '__none__']: 'core',
    [process.env.PAYSTACK_PLAN_PRO  || '__none__']: 'pro',
    [process.env.PAYSTACK_PLAN_PROP || '__none__']: 'prop',
  };
  return map[planCode] ?? null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: 'webhook secret missing' }, { status: 500 });

  const raw = await req.text();
  const sig = req.headers.get('x-paystack-signature') ?? '';

  const digest = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  if (digest !== sig) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(raw);
  const eventType: string = event.event;
  const data = event.data ?? {};
  const supabase = adminClient();

  if (eventType === 'charge.success') {
    const userId: string | undefined = data.metadata?.user_id;
    const plan: string | null =
      data.metadata?.plan ??
      (data.plan?.plan_code ? planFromCode(data.plan.plan_code) : null);

    if (userId && plan) {
      await supabase.from('profiles').update({
        plan,
        subscribed_at: new Date().toISOString(),
        trial_ends_at: null,
      }).eq('id', userId);
    }

  } else if (eventType === 'subscription.create') {
    const userId: string | undefined = data.metadata?.user_id;
    const plan: string | null =
      data.metadata?.plan ??
      (data.plan?.plan_code ? planFromCode(data.plan.plan_code) : null);

    if (userId && plan) {
      await supabase.from('profiles').update({
        plan,
        subscribed_at: new Date().toISOString(),
        trial_ends_at: null,
      }).eq('id', userId);
    }

  } else if (eventType === 'subscription.disable') {
    const customerEmail: string | undefined = data.customer?.email;
    if (customerEmail) {
      // Look up auth user by email to get their profile ID
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const user = users?.find((u) => u.email === customerEmail);
      if (user) {
        await supabase.from('profiles').update({ plan: 'cancelled' }).eq('id', user.id);
      }
    }

  } else if (eventType === 'invoice.payment_failed') {
    // Non-fatal — Paystack will retry. Log for visibility.
    console.warn('[paystack] invoice.payment_failed', {
      customer: data.customer?.email,
      subscription: data.subscription_code,
    });
  }

  return NextResponse.json({ ok: true });
}
