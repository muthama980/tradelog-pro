import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

interface BybitExecution {
  symbol: string;
  side: 'Buy' | 'Sell';
  execPrice: string;
  execQty: string;
  execFee: string;
  execTime: string;
  orderId: string;
  closedSize: string;
}

interface OrderGroup {
  symbol: string;
  direction: 'long' | 'short';
  totalQty: number;
  totalFee: number;
  price: number;
  time: string;
}

function addSlash(symbol: string): string {
  const quotes = ['USDT', 'USDC', 'BUSD', 'BTC', 'ETH', 'USD'];
  for (const q of quotes) {
    if (symbol.endsWith(q) && symbol.length > q.length + 1) {
      return `${symbol.slice(0, -q.length)}/${q}`;
    }
  }
  return symbol;
}

function buildHeaders(apiKey: string, apiSecret: string, queryString: string) {
  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  // Bybit V5 GET signature: timestamp + apiKey + recvWindow + queryString
  const preSign = timestamp + apiKey + recvWindow + queryString;
  const signature = crypto.createHmac('sha256', apiSecret).update(preSign).digest('hex');
  return {
    timestamp,
    headers: {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-SIGN': signature,
      'X-BAPI-RECV-WINDOW': recvWindow,
    },
  };
}

async function tryFetch(baseUrl: string, apiKey: string, apiSecret: string, queryString: string): Promise<{ ok: boolean; text: string; status: number }> {
  const { headers } = buildHeaders(apiKey, apiSecret, queryString);
  try {
    const res = await fetch(`${baseUrl}/v5/execution/list?${queryString}`, { method: 'GET', headers });
    const text = await res.text();
    return { ok: res.status < 500, text, status: res.status };
  } catch (err) {
    return { ok: false, text: String(err), status: 0 };
  }
}

async function fetchBybitExecutions(apiKey: string, apiSecret: string): Promise<BybitExecution[]> {
  const queryString = 'category=linear&limit=100';

  // api.bybit.nl is the Netherlands endpoint, not geo-blocked by CloudFront
  // api-testnet.bybit.com as last resort (won't have real trades but confirms connectivity)
  const candidates = ['https://api.bybit.nl', 'https://api-testnet.bybit.com'];
  let lastError = '';

  for (const base of candidates) {
    const result = await tryFetch(base, apiKey, apiSecret, queryString);
    console.log(`[bybit-sync] ${base} → HTTP ${result.status} | body(200): ${result.text.substring(0, 200)}`);

    if (!result.ok) {
      lastError = `${base} failed (${result.status}): ${result.text.substring(0, 100)}`;
      continue;
    }

    let data: { retCode: number; retMsg: string; result?: { list: BybitExecution[] } };
    try {
      data = JSON.parse(result.text);
    } catch {
      lastError = `${base} returned non-JSON: ${result.text.substring(0, 100)}`;
      continue;
    }

    if (data.retCode !== 0) {
      // Auth errors are definitive — no point trying other domains
      throw new Error(`Bybit API error (${data.retCode}): ${data.retMsg}`);
    }

    console.log(`[bybit-sync] Success via ${base}`);
    return data.result?.list ?? [];
  }

  throw new Error(lastError || 'All Bybit API endpoints failed');
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: conn } = await supabase
    .from('exchange_connections')
    .select('api_key, api_secret')
    .eq('user_id', user.id)
    .eq('exchange', 'bybit')
    .single();

  if (!conn) return NextResponse.json({ error: 'Bybit not connected' }, { status: 404 });

  const apiKey = conn.api_key.trim();
  const apiSecret = conn.api_secret.trim();

  let executions: BybitExecution[];
  try {
    executions = await fetchBybitExecutions(apiKey, apiSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[bybit-sync] Error:', msg);
    await supabase
      .from('exchange_connections')
      .update({ status: 'error', error_message: msg })
      .eq('user_id', user.id)
      .eq('exchange', 'bybit');
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  console.log('[bybit-sync] Executions fetched:', executions.length);

  const byOrder: Record<string, OrderGroup> = {};
  for (const ex of executions) {
    if (!byOrder[ex.orderId]) {
      byOrder[ex.orderId] = {
        symbol: addSlash(ex.symbol),
        direction: ex.side === 'Buy' ? 'long' : 'short',
        totalQty: 0,
        totalFee: 0,
        price: parseFloat(ex.execPrice),
        time: new Date(parseInt(ex.execTime)).toISOString(),
      };
    }
    byOrder[ex.orderId].totalQty += parseFloat(ex.execQty);
    byOrder[ex.orderId].totalFee += parseFloat(ex.execFee);
  }

  if (Object.keys(byOrder).length === 0) {
    await supabase
      .from('exchange_connections')
      .update({ last_synced_at: new Date().toISOString(), status: 'active', error_message: null })
      .eq('user_id', user.id)
      .eq('exchange', 'bybit');
    return NextResponse.json({ imported: 0 });
  }

  const { data: existing } = await supabase
    .from('trades')
    .select('symbol, entry_price, opened_at')
    .eq('user_id', user.id);

  const existingKeys = new Set(
    (existing ?? []).map(t => `${t.symbol}|${t.entry_price}|${new Date(t.opened_at).toISOString().slice(0, 16)}`)
  );

  const toInsert = Object.values(byOrder)
    .filter(o => !existingKeys.has(`${o.symbol}|${o.price}|${o.time.slice(0, 16)}`))
    .map(o => ({
      user_id: user.id,
      symbol: o.symbol,
      market: 'crypto' as const,
      direction: o.direction,
      entry_price: o.price,
      exit_price: null,
      position_size: o.totalQty,
      fees: o.totalFee,
      pnl: null,
      opened_at: o.time,
      closed_at: null,
      status: 'closed' as const,
    }));

  let imported = 0;
  for (let i = 0; i < toInsert.length; i += 50) {
    const { error } = await supabase.from('trades').insert(toInsert.slice(i, i + 50));
    if (!error) imported += Math.min(50, toInsert.length - i);
  }

  await supabase
    .from('exchange_connections')
    .update({ last_synced_at: new Date().toISOString(), status: 'active', error_message: null })
    .eq('user_id', user.id)
    .eq('exchange', 'bybit');

  console.log('[bybit-sync] Imported:', imported);
  return NextResponse.json({ imported });
}
