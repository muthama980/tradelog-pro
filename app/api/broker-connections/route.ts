import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rateLimit';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('broker_connections')
    .select('id, broker_name, platform, account_number, server, status, last_synced_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!rateLimit(`${user.id}:broker-connections`, 10)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  const body = await req.json();
  const { broker_name, platform, account_number, server } = body as {
    broker_name: string;
    platform: string;
    account_number: string;
    server: string;
  };

  if (!broker_name || !platform || !account_number || !server) {
    return NextResponse.json({ error: 'broker_name, platform, account_number, and server are required' }, { status: 400 });
  }
  if (!['mt4', 'mt5'].includes(platform)) {
    return NextResponse.json({ error: 'platform must be mt4 or mt5' }, { status: 400 });
  }
  if (!/^\d+$/.test(account_number.trim())) {
    return NextResponse.json({ error: 'Account number must be numeric' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('broker_connections')
    .insert({
      user_id: user.id,
      broker_name: broker_name.trim(),
      platform,
      account_number: account_number.trim(),
      server: server.trim(),
      status: 'pending',
    })
    .select('id, broker_name, platform, account_number, server, status, last_synced_at, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase
    .from('broker_connections')
    .delete()
    .eq('user_id', user.id)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
