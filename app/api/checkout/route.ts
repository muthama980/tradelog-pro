import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rateLimit';

const VARIANT_IDS: Record<string, string> = {
  core: process.env.LS_VARIANT_CORE || '1595454',
  pro:  process.env.LS_VARIANT_PRO  || '1595468',
  prop: process.env.LS_VARIANT_PROP || '1595479',
};

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();

    if (!['core', 'pro', 'prop'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!rateLimit(`${user.id}:checkout`, 10)) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    const apiKey  = process.env.LEMON_SQUEEZY_API_KEY;
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
    if (!apiKey || !storeId) {
      return NextResponse.json({ error: 'Lemon Squeezy not configured' }, { status: 500 });
    }

    const variantId = VARIANT_IDS[plan];
    const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL || 'https://tradelogpro.xyz';

    const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: user.email,
              custom: { user_id: user.id, plan },
            },
            product_options: {
              redirect_url: `${siteUrl}/dashboard?checkout=success`,
            },
          },
          relationships: {
            store:   { data: { type: 'stores',   id: String(storeId) } },
            variant: { data: { type: 'variants', id: String(variantId) } },
          },
        },
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: 'Lemon Squeezy error', details: json }, { status: 500 });
    }

    return NextResponse.json({ url: json?.data?.attributes?.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 });
  }
}
