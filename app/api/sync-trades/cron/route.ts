import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Uses service role to read all connections (bypasses RLS)
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

async function syncExchange(userId: string, exchange: string): Promise<{ imported: number; error?: string }> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  // Call the per-exchange sync endpoint on behalf of the user by passing the service key
  const res = await fetch(`${base}/api/sync-trades/${exchange}`, {
    method: 'POST',
    headers: {
      'x-cron-user-id': userId, // handled below by each sync route if needed
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { imported: 0, error: err.error ?? res.statusText };
  }
  return res.json();
}

export async function GET(req: Request) {
  // Verify this is a legitimate Vercel cron call
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
    const result = await syncExchange(conn.user_id, conn.exchange);
    results.push({ user_id: conn.user_id, exchange: conn.exchange, ...result });
    console.log(`[cron] ${conn.exchange} user=${conn.user_id} imported=${result.imported} error=${result.error ?? 'none'}`);
  }

  return NextResponse.json({ synced: results.length, results });
}
