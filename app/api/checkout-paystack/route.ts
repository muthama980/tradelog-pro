import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PLAN_AMOUNTS: Record<string, number> = {
  core: 190000,
  pro:  250000,
  prop: 300000,
};

const PLAN_CODES: Record<string, string | undefined> = {
  core: process.env.PAYSTACK_PLAN_CORE,
  pro:  process.env.PAYSTACK_PLAN_PRO,
  prop: process.env.PAYSTACK_PLAN_PROP,
};

export async function POST(req: NextRequest) {
  try {
    const { plan, channels } = await req.json();

    if (!['core', 'pro', 'prop'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Paystack not configured' }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const planCode = PLAN_CODES[plan];

    const body: Record<string, unknown> = {
      email: user.email,
      amount: PLAN_AMOUNTS[plan],
      currency: 'KES',
      callback_url: `${siteUrl}/api/paystack/callback`,
      metadata: {
        user_id: user.id,
        plan,
        custom_fields: [
          { display_name: 'Plan',    variable_name: 'plan',    value: plan },
          { display_name: 'User ID', variable_name: 'user_id', value: user.id },
        ],
      },
    };

    if (planCode) body.plan = planCode;
    if (Array.isArray(channels) && channels.length > 0) body.channels = channels;

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok || !json.status) {
      return NextResponse.json({ error: 'Paystack error', details: json }, { status: 500 });
    }

    return NextResponse.json({ url: json.data.authorization_url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
