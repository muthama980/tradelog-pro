import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PLAN_PRICES: Record<string, number> = {
  core: 19,
  pro:  25,
  prop: 30,
};

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();

    if (!['core', 'pro', 'prop'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'NOWPayments not configured' }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const body = {
      price_amount: PLAN_PRICES[plan],
      price_currency: 'usd',
      pay_currency: 'usdttrc20',
      order_id: `${user.id}_${plan}_${Date.now()}`,
      order_description: `TradeLog Pro ${plan} plan - monthly subscription`,
      success_url: `${siteUrl}/dashboard?checkout=success`,
      cancel_url: `${siteUrl}/pricing`,
    };

    const res = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok || !json.invoice_url) {
      return NextResponse.json({ error: 'NOWPayments error', details: json }, { status: 500 });
    }

    return NextResponse.json({ url: json.invoice_url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
