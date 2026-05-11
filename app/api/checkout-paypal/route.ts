import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PLAN_PRICES: Record<string, number> = {
  core: 19,
  pro:  25,
  prop: 30,
};

function paypalBase() {
  return process.env.PAYPAL_MODE === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString('base64');

  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error('Failed to get PayPal access token');
  const json = await res.json();
  return json.access_token as string;
}

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();

    if (!['core', 'pro', 'prop'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) {
      return NextResponse.json({ error: 'PayPal not configured' }, { status: 500 });
    }

    const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL || 'https://tradelogpro.xyz';
    const price    = PLAN_PRICES[plan].toFixed(2);
    const token    = await getAccessToken();

    const body = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'USD', value: price },
        description: `TradeLog Pro ${plan} plan`,
        custom_id: `${user.id}_${plan}`,
      }],
      application_context: {
        return_url: `${siteUrl}/api/paypal/callback?user_id=${encodeURIComponent(user.id)}&plan=${plan}`,
        cancel_url: `${siteUrl}/pricing`,
        brand_name: 'TradeLog Pro',
        user_action: 'PAY_NOW',
      },
    };

    const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: 'PayPal error', details: json }, { status: 500 });
    }

    const approvalLink = (json.links as Array<{ rel: string; href: string }>)
      ?.find((l) => l.rel === 'approve')?.href;

    if (!approvalLink) {
      return NextResponse.json({ error: 'No PayPal approval URL returned' }, { status: 500 });
    }

    return NextResponse.json({ url: approvalLink });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
