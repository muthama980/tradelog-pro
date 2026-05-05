import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('exchange_connections')
    .select('id, exchange, status, last_synced_at, error_message')
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { exchange, api_key, api_secret } = await req.json();
  if (!exchange || !api_key || !api_secret) {
    return NextResponse.json({ error: 'exchange, api_key, and api_secret are required' }, { status: 400 });
  }
  if (!['binance', 'bybit'].includes(exchange)) {
    return NextResponse.json({ error: 'Unsupported exchange' }, { status: 400 });
  }

  const { error } = await supabase
    .from('exchange_connections')
    .upsert(
      { user_id: user.id, exchange, api_key, api_secret, status: 'active', error_message: null },
      { onConflict: 'user_id,exchange' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { exchange } = await req.json();
  if (!exchange) return NextResponse.json({ error: 'exchange is required' }, { status: 400 });

  const { error } = await supabase
    .from('exchange_connections')
    .delete()
    .eq('user_id', user.id)
    .eq('exchange', exchange);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
