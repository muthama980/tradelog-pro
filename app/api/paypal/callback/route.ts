import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function paypalBase() {
  return process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
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

export async function GET(req: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tradelogpro.xyz';
  const { searchParams } = req.nextUrl;

  // PayPal appends `token` (order ID) and `PayerID` to the return_url
  const orderId = searchParams.get('token');
  const userId  = searchParams.get('user_id');
  const plan    = searchParams.get('plan');

  if (!orderId || !userId || !plan || !['core', 'pro', 'prop'].includes(plan)) {
    return NextResponse.redirect(`${siteUrl}/dashboard?checkout=failed`);
  }

  try {
    const token = await getAccessToken();

    const res = await fetch(`${paypalBase()}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const json = await res.json();
    if (!res.ok || json.status !== 'COMPLETED') {
      return NextResponse.redirect(`${siteUrl}/dashboard?checkout=failed`);
    }

    const supabase = adminClient();
    await supabase.from('profiles').update({
      plan,
      subscribed_at: new Date().toISOString(),
      trial_ends_at: null,
    }).eq('id', userId);

    return NextResponse.redirect(`${siteUrl}/dashboard?checkout=success`);
  } catch {
    return NextResponse.redirect(`${siteUrl}/dashboard?checkout=failed`);
  }
}
