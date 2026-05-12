import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { decrypt } from './encryption';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface SyncResult {
  imported: number;
  error?: string;
}

type TradeInsert = {
  user_id: string;
  symbol: string;
  market: 'crypto' | 'forex' | 'stocks' | 'futures' | 'other';
  direction: 'long' | 'short';
  entry_price: number;
  exit_price: number | null;
  position_size: number;
  fees: number;
  pnl: number | null;
  opened_at: string;
  closed_at: string | null;
  status: 'open' | 'closed';
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

function addSlash(sym: string): string {
  for (const q of ['USDT', 'USDC', 'BUSD', 'BTC', 'ETH', 'USD', 'BNB']) {
    if (sym.endsWith(q) && sym.length > q.length + 1)
      return `${sym.slice(0, -q.length)}/${q}`;
  }
  return sym;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function dedup(supabase: SupabaseClient<any>, userId: string, trades: TradeInsert[]): Promise<number> {
  if (trades.length === 0) return 0;
  const { data: existing } = await supabase
    .from('trades')
    .select('symbol, entry_price, opened_at')
    .eq('user_id', userId);

  const keys = new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (existing ?? []).map((t: any) =>
      `${t.symbol}|${t.entry_price}|${new Date(t.opened_at).toISOString().slice(0, 16)}`
    )
  );
  const toInsert = trades.filter(
    t => !keys.has(`${t.symbol}|${t.entry_price}|${new Date(t.opened_at).toISOString().slice(0, 16)}`)
  );
  let imported = 0;
  for (let i = 0; i < toInsert.length; i += 50) {
    const { error } = await supabase.from('trades').insert(toInsert.slice(i, i + 50));
    if (!error) imported += Math.min(50, toInsert.length - i);
  }
  return imported;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function setConnStatus(supabase: SupabaseClient<any>, userId: string, exchange: string, ok: boolean, msg?: string) {
  await supabase
    .from('exchange_connections')
    .update({
      status: ok ? 'active' : 'error',
      ...(ok ? { last_synced_at: new Date().toISOString(), error_message: null } : { error_message: msg ?? 'Sync failed' }),
    })
    .eq('user_id', userId)
    .eq('exchange', exchange);
}

// ─── Binance ──────────────────────────────────────────────────────────────────

interface BinanceTrade {
  symbol: string; price: string; qty: string; commission: string;
  time: number; isBuyer: boolean;
}
interface BinanceSymbol { symbol: string; status: string; }

async function fetchBinanceSymbolTrades(apiKey: string, secret: string, symbol: string): Promise<BinanceTrade[]> {
  const ts = Date.now();
  const qs = `symbol=${symbol}&limit=100&timestamp=${ts}`;
  const sig = crypto.createHmac('sha256', secret).update(qs).digest('hex');
  const res = await fetch(`https://api.binance.com/api/v3/myTrades?${qs}&signature=${sig}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncBinance(supabase: SupabaseClient<any>, userId: string): Promise<SyncResult> {
  const { data: conn } = await supabase
    .from('exchange_connections').select('api_key, api_secret')
    .eq('user_id', userId).eq('exchange', 'binance').single();
  if (!conn) return { imported: 0, error: 'Binance not connected' };

  const apiKey = decrypt(conn.api_key);
  const apiSecret = decrypt(conn.api_secret);

  const infoRes = await fetch('https://api.binance.com/api/v3/exchangeInfo', {
    headers: { 'X-MBX-APIKEY': apiKey },
  });
  if (!infoRes.ok) {
    const msg = 'Binance exchangeInfo failed';
    await setConnStatus(supabase, userId, 'binance', false, msg);
    return { imported: 0, error: msg };
  }
  const info = await infoRes.json();
  const symbols: string[] = ((info.symbols as BinanceSymbol[]) ?? [])
    .filter(s => s.status === 'TRADING' && s.symbol.endsWith('USDT'))
    .slice(0, 20).map(s => s.symbol);

  const all = (await Promise.all(symbols.map(s => fetchBinanceSymbolTrades(apiKey, apiSecret, s)))).flat();

  const trades: TradeInsert[] = all.map(t => ({
    user_id: userId,
    symbol: addSlash(t.symbol),
    market: 'crypto',
    direction: t.isBuyer ? 'long' : 'short',
    entry_price: parseFloat(t.price),
    exit_price: null,
    position_size: parseFloat(t.qty),
    fees: parseFloat(t.commission),
    pnl: null,
    opened_at: new Date(t.time).toISOString(),
    closed_at: null,
    status: 'closed',
  }));

  const imported = await dedup(supabase, userId, trades);
  await setConnStatus(supabase, userId, 'binance', true);
  return { imported };
}

// ─── Coinbase (Advanced Trade) ────────────────────────────────────────────────

interface CoinbaseFill {
  trade_time: string; price: string; size: string;
  commission: string; product_id: string; side: string;
}

function coinbaseSign(ts: string, method: string, path: string, body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(ts + method + path + body).digest('hex');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncCoinbase(supabase: SupabaseClient<any>, userId: string): Promise<SyncResult> {
  const { data: conn } = await supabase
    .from('exchange_connections').select('api_key, api_secret')
    .eq('user_id', userId).eq('exchange', 'coinbase').single();
  if (!conn) return { imported: 0, error: 'Coinbase not connected' };

  const apiKey = decrypt(conn.api_key);
  const apiSecret = decrypt(conn.api_secret);

  const ts = Math.floor(Date.now() / 1000).toString();
  const path = '/api/v3/brokerage/orders/historical/fills';
  const sign = coinbaseSign(ts, 'GET', path, '', apiSecret);

  const res = await fetch(`https://api.coinbase.com${path}`, {
    headers: {
      'CB-ACCESS-KEY': apiKey,
      'CB-ACCESS-SIGN': sign,
      'CB-ACCESS-TIMESTAMP': ts,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { message?: string }).message ?? res.statusText;
    await setConnStatus(supabase, userId, 'coinbase', false, msg);
    return { imported: 0, error: msg };
  }

  const data = await res.json();
  const fills: CoinbaseFill[] = data.fills ?? [];
  const trades: TradeInsert[] = fills.map(f => ({
    user_id: userId,
    symbol: f.product_id.replace('-', '/'),
    market: 'crypto',
    direction: f.side.toLowerCase() === 'buy' ? 'long' : 'short',
    entry_price: parseFloat(f.price),
    exit_price: null,
    position_size: parseFloat(f.size),
    fees: parseFloat(f.commission),
    pnl: null,
    opened_at: f.trade_time,
    closed_at: null,
    status: 'closed',
  }));

  const imported = await dedup(supabase, userId, trades);
  await setConnStatus(supabase, userId, 'coinbase', true);
  return { imported };
}

// ─── Kraken ───────────────────────────────────────────────────────────────────

interface KrakenTrade {
  pair: string; time: number; type: string;
  price: string; vol: string; fee: string;
}

function krakenSign(path: string, nonce: string, postData: string, privateKey: string): string {
  const hash = crypto.createHash('sha256').update(nonce + postData).digest();
  const hmac = crypto.createHmac('sha512', Buffer.from(privateKey, 'base64'));
  hmac.update(Buffer.from(path));
  hmac.update(hash);
  return hmac.digest('base64');
}

const KRAKEN_PAIRS: Record<string, string> = {
  XXBTZUSD: 'BTC/USD', XBTUSD: 'BTC/USD', XBTUSDT: 'BTC/USDT',
  XETHZUSD: 'ETH/USD', ETHUSD: 'ETH/USD', ETHUSDT: 'ETH/USDT',
  XLTCZUSD: 'LTC/USD', LTCUSD: 'LTC/USD',
  XXRPZUSD: 'XRP/USD', XRPUSD: 'XRP/USD',
  XXBTZEUR: 'BTC/EUR', XETHZEUR: 'ETH/EUR',
};

function normalizeKrakenPair(pair: string): string {
  return KRAKEN_PAIRS[pair] ?? pair.replace(/^X([A-Z]{3,4})Z([A-Z]{3,4})$/, '$1/$2');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncKraken(supabase: SupabaseClient<any>, userId: string): Promise<SyncResult> {
  const { data: conn } = await supabase
    .from('exchange_connections').select('api_key, api_secret')
    .eq('user_id', userId).eq('exchange', 'kraken').single();
  if (!conn) return { imported: 0, error: 'Kraken not connected' };

  const apiKey = decrypt(conn.api_key);
  const apiSecret = decrypt(conn.api_secret);

  const path = '/0/private/TradesHistory';
  const nonce = Date.now().toString();
  const postData = `nonce=${nonce}`;
  const sign = krakenSign(path, nonce, postData, apiSecret);

  const res = await fetch(`https://api.kraken.com${path}`, {
    method: 'POST',
    headers: {
      'API-Key': apiKey,
      'API-Sign': sign,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: postData,
  });

  if (!res.ok) {
    const msg = res.statusText;
    await setConnStatus(supabase, userId, 'kraken', false, msg);
    return { imported: 0, error: msg };
  }

  const data = await res.json();
  if (Array.isArray(data.error) && data.error.length > 0) {
    const msg = data.error.join(', ');
    await setConnStatus(supabase, userId, 'kraken', false, msg);
    return { imported: 0, error: msg };
  }

  const tradeMap: Record<string, KrakenTrade> = data.result?.trades ?? {};
  const trades: TradeInsert[] = Object.values(tradeMap).map(t => ({
    user_id: userId,
    symbol: normalizeKrakenPair(t.pair),
    market: 'crypto',
    direction: t.type === 'buy' ? 'long' : 'short',
    entry_price: parseFloat(t.price),
    exit_price: null,
    position_size: parseFloat(t.vol),
    fees: parseFloat(t.fee),
    pnl: null,
    opened_at: new Date(t.time * 1000).toISOString(),
    closed_at: null,
    status: 'closed',
  }));

  const imported = await dedup(supabase, userId, trades);
  await setConnStatus(supabase, userId, 'kraken', true);
  return { imported };
}

// ─── OKX ──────────────────────────────────────────────────────────────────────

interface OKXFill {
  instId: string; fillSz: string; fillPx: string;
  side: string; fee: string; ts: string;
}

function okxSign(ts: string, method: string, path: string, body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(ts + method + path + body).digest('base64');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncOKX(supabase: SupabaseClient<any>, userId: string): Promise<SyncResult> {
  const { data: conn } = await supabase
    .from('exchange_connections').select('api_key, api_secret, api_passphrase')
    .eq('user_id', userId).eq('exchange', 'okx').single();
  if (!conn) return { imported: 0, error: 'OKX not connected' };

  const apiKey = decrypt(conn.api_key);
  const apiSecret = decrypt(conn.api_secret);
  const apiPassphrase = conn.api_passphrase ? decrypt(conn.api_passphrase) : '';

  const ts = new Date().toISOString();
  const path = '/api/v5/trade/fills-history?instType=SPOT';
  const sign = okxSign(ts, 'GET', path, '', apiSecret);

  const res = await fetch(`https://www.okx.com${path}`, {
    headers: {
      'OK-ACCESS-KEY': apiKey,
      'OK-ACCESS-SIGN': sign,
      'OK-ACCESS-TIMESTAMP': ts,
      'OK-ACCESS-PASSPHRASE': apiPassphrase,
    },
  });

  if (!res.ok) {
    const msg = res.statusText;
    await setConnStatus(supabase, userId, 'okx', false, msg);
    return { imported: 0, error: msg };
  }

  const data = await res.json();
  if (data.code !== '0') {
    const msg: string = data.msg || 'OKX API error';
    await setConnStatus(supabase, userId, 'okx', false, msg);
    return { imported: 0, error: msg };
  }

  const fills: OKXFill[] = data.data ?? [];
  const trades: TradeInsert[] = fills.map(f => {
    const fee = parseFloat(f.fee);
    return {
      user_id: userId,
      symbol: f.instId.replace(/-/g, '/'),
      market: 'crypto',
      direction: f.side === 'buy' ? 'long' : 'short',
      entry_price: parseFloat(f.fillPx),
      exit_price: null,
      position_size: parseFloat(f.fillSz),
      fees: Math.abs(isNaN(fee) ? 0 : fee),
      pnl: null,
      opened_at: new Date(parseInt(f.ts)).toISOString(),
      closed_at: null,
      status: 'closed',
    };
  });

  const imported = await dedup(supabase, userId, trades);
  await setConnStatus(supabase, userId, 'okx', true);
  return { imported };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncExchange(supabase: SupabaseClient<any>, userId: string, exchange: string): Promise<SyncResult> {
  switch (exchange) {
    case 'binance':  return syncBinance(supabase, userId);
    case 'coinbase': return syncCoinbase(supabase, userId);
    case 'kraken':   return syncKraken(supabase, userId);
    case 'okx':      return syncOKX(supabase, userId);
    default:         return { imported: 0, error: `No sync implemented for ${exchange}` };
  }
}
