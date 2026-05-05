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

// NOWPayments IPN: sort all keys alphabetically (deep), stringify, HMAC-SHA-512
function sortDeep(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(obj).sort().reduce((acc, key) => {
    const val = obj[key];
    acc[key] = val !== null && typeof val === 'object' && !Array.isArray(val)
      ? sortDeep(val as Record<string, unknown>)
      : val;
    return acc;
  }, {} as Record<string, unknown>);
}

export async function POST(req: NextRequest) {
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!ipnSecret) return NextResponse.json({ error: 'IPN secret missing' }, { status: 500 });

  const raw = await req.text();
  const sig = req.headers.get('x-nowpayments-sig') ?? '';

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const digest = crypto
    .createHmac('sha512', ipnSecret)
    .update(JSON.stringify(sortDeep(payload)))
    .digest('hex');

  if (digest !== sig) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const status = payload.payment_status as string;
  const orderId = payload.order_id as string | undefined;

  if (status === 'finished' || status === 'confirmed') {
    if (!orderId) return NextResponse.json({ ok: true });

    // order_id format: `${uuid}_${plan}_${timestamp}`
    // UUIDs use hyphens only, so splitting on _ is safe
    const parts = orderId.split('_');
    const userId = parts[0];
    const plan   = parts[1];

    if (!userId || !['core', 'pro', 'prop'].includes(plan)) {
      console.warn('[nowpayments] unrecognised order_id', orderId);
      return NextResponse.json({ ok: true });
    }

    const supabase = adminClient();
    await supabase.from('profiles').update({
      plan,
      subscribed_at: new Date().toISOString(),
      trial_ends_at: null,
    }).eq('id', userId);

  } else if (status === 'failed' || status === 'expired') {
    console.warn('[nowpayments] payment not completed', { status, orderId });
  }

  return NextResponse.json({ ok: true });
}
