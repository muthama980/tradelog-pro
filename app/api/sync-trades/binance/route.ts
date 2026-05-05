import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

interface BinanceTrade {
  symbol: string;
  id: number;
  orderId: number;
  price: string;
  qty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
}

interface BinanceSymbol {
  symbol: string;
  status: string;
}

function addSlash(symbol: string): string {
  const quotes = ['USDT', 'USDC', 'BUSD', 'BTC', 'ETH', 'USD', 'BNB'];
  for (const q of quotes) {
    if (symbol.endsWith(q) && symbol.length > q.length + 1) {
      return `${symbol.slice(0, -q.length)}/${q}`;
    }
  }
  return symbol;
}

function sign(queryString: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

async function fetchActiveSymbols(apiKey: string): Promise<string[]> {
  const res = await fetch('https://api.binance.com/api/v3/exchangeInfo', {
    headers: { 'X-MBX-APIKEY': apiKey },
  });
  const json = await res.json();
  return (json.symbols as BinanceSymbol[])
    .filter(s => s.status === 'TRADING' && s.symbol.endsWith('USDT'))
    .slice(0, 20) // limit to top 20 USDT pairs to avoid rate limits
    .map(s => s.symbol);
}

async function fetchTradesForSymbol(
  apiKey: string,
  apiSecret: string,
  symbol: string
): Promise<BinanceTrade[]> {
  const timestamp = Date.now();
  const qs = `symbol=${symbol}&limit=100&timestamp=${timestamp}`;
  const sig = sign(qs, apiSecret);
  const res = await fetch(`https://api.binance.com/api/v3/myTrades?${qs}&signature=${sig}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: conn } = await supabase
    .from('exchange_connections')
    .select('api_key, api_secret')
    .eq('user_id', user.id)
    .eq('exchange', 'binance')
    .single();

  if (!conn) return NextResponse.json({ error: 'Binance not connected' }, { status: 404 });

  let allTrades: BinanceTrade[] = [];
  try {
    const symbols = await fetchActiveSymbols(conn.api_key);
    const results = await Promise.all(
      symbols.map(s => fetchTradesForSymbol(conn.api_key, conn.api_secret, s))
    );
    allTrades = results.flat();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await supabase
      .from('exchange_connections')
      .update({ status: 'error', error_message: msg })
      .eq('user_id', user.id)
      .eq('exchange', 'binance');
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (allTrades.length === 0) {
    await supabase
      .from('exchange_connections')
      .update({ last_synced_at: new Date().toISOString(), status: 'active', error_message: null })
      .eq('user_id', user.id)
      .eq('exchange', 'binance');
    return NextResponse.json({ imported: 0 });
  }

  // Duplicate detection
  const { data: existing } = await supabase
    .from('trades')
    .select('symbol, entry_price, opened_at')
    .eq('user_id', user.id);

  const existingKeys = new Set(
    (existing ?? []).map(t => `${t.symbol}|${t.entry_price}|${new Date(t.opened_at).toISOString().slice(0, 16)}`)
  );

  const toInsert = allTrades
    .map(t => {
      const openedAt = new Date(t.time).toISOString();
      const price = parseFloat(t.price);
      const symbol = addSlash(t.symbol);
      return {
        user_id: user.id,
        symbol,
        market: 'crypto' as const,
        direction: t.isBuyer ? 'long' as const : 'short' as const,
        entry_price: price,
        exit_price: null,
        position_size: parseFloat(t.qty),
        fees: parseFloat(t.commission),
        pnl: null,
        opened_at: openedAt,
        closed_at: null,
        status: 'closed' as const,
        _key: `${symbol}|${price}|${openedAt.slice(0, 16)}`,
      };
    })
    .filter(t => !existingKeys.has(t._key))
    .map(({ _key, ...t }) => t);

  let imported = 0;
  for (let i = 0; i < toInsert.length; i += 50) {
    const { error } = await supabase.from('trades').insert(toInsert.slice(i, i + 50));
    if (!error) imported += Math.min(50, toInsert.length - i);
  }

  await supabase
    .from('exchange_connections')
    .update({ last_synced_at: new Date().toISOString(), status: 'active', error_message: null })
    .eq('user_id', user.id)
    .eq('exchange', 'binance');

  return NextResponse.json({ imported });
}
