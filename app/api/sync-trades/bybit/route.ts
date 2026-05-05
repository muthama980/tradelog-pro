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

async function fetchBybitExecutions(apiKey: string, apiSecret: string): Promise<BybitExecution[]> {
  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  const queryString = 'category=linear&limit=100';
  const preSign = timestamp + apiKey + recvWindow + queryString;
  const signature = crypto.createHmac('sha256', apiSecret).update(preSign).digest('hex');

  const url = `https://api.bybit.com/v5/execution/list?${queryString}`;
  const res = await fetch(url, {
    headers: {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-SIGN': signature,
      'X-BAPI-RECV-WINDOW': recvWindow,
    },
  });

  const json = await res.json();
  if (json.retCode !== 0) throw new Error(json.retMsg ?? 'Bybit API error');
  return (json.result?.list ?? []) as BybitExecution[];
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Load credentials
  const { data: conn } = await supabase
    .from('exchange_connections')
    .select('api_key, api_secret')
    .eq('user_id', user.id)
    .eq('exchange', 'bybit')
    .single();

  if (!conn) return NextResponse.json({ error: 'Bybit not connected' }, { status: 404 });

  let executions: BybitExecution[];
  try {
    executions = await fetchBybitExecutions(conn.api_key, conn.api_secret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await supabase
      .from('exchange_connections')
      .update({ status: 'error', error_message: msg })
      .eq('user_id', user.id)
      .eq('exchange', 'bybit');
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Group partial fills by orderId
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

  // Duplicate detection: existing (symbol, entry_price, opened_at[min])
  const { data: existing } = await supabase
    .from('trades')
    .select('symbol, entry_price, opened_at')
    .eq('user_id', user.id);

  const existingKeys = new Set(
    (existing ?? []).map(t => `${t.symbol}|${t.entry_price}|${new Date(t.opened_at).toISOString().slice(0, 16)}`)
  );

  const toInsert = Object.values(byOrder)
    .filter(o => {
      const key = `${o.symbol}|${o.price}|${o.time.slice(0, 16)}`;
      return !existingKeys.has(key);
    })
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

  return NextResponse.json({ imported });
}
