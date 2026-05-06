import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncExchange } from '@/lib/exchangeSync';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();

  const { data: connections, error } = await supabase
    .from('exchange_connections')
    .select('user_id, exchange')
    .eq('status', 'active');

  if (error) {
    console.error('[cron] Failed to fetch connections:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { user_id: string; exchange: string; imported: number; error?: string }[] = [];

  for (const conn of connections ?? []) {
    const result = await syncExchange(supabase, conn.user_id, conn.exchange);
    results.push({ user_id: conn.user_id, exchange: conn.exchange, ...result });
    console.log(`[cron] ${conn.exchange} user=${conn.user_id} imported=${result.imported} error=${result.error ?? 'none'}`);
  }

  return NextResponse.json({ synced: results.length, results });
}
