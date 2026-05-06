import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseBinance, parseMetaTrader, parseGeneric, ParsedTrade } from '@/lib/csvParsers';

function addSlash(sym: string): string {
  for (const q of ['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'BNB']) {
    if (sym.endsWith(q) && sym.length > q.length + 1) return sym.slice(0, -q.length) + '/' + q;
  }
  return sym;
}

// Handles Bybit date formats:
//   "14:43 2025-03-04"       (HH:MM YYYY-MM-DD)
//   "14:43:21 2025-03-04"    (HH:MM:SS YYYY-MM-DD)
//   "2025-03-04 14:43:21"    (standard)
function parseBybitDate(str: string): string {
  if (!str) return new Date().toISOString();
  // Time-first format: "HH:MM[:SS] YYYY-MM-DD"
  const timeFirst = str.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(\d{4}-\d{2}-\d{2})$/);
  if (timeFirst) {
    const time = timeFirst[1].length === 5 ? timeFirst[1] + ':00' : timeFirst[1];
    const d = new Date(`${timeFirst[2]}T${time}Z`);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  // Standard format: "YYYY-MM-DD HH:MM[:SS]"
  const std = str.replace(' ', 'T');
  const d = new Date(std.endsWith('Z') ? std : std + 'Z');
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

interface BybitOrderGroup {
  symbol: string;
  direction: 'long' | 'short';
  price: number;
  totalQty: number;
  totalFee: number;
  date: string;
}

// Inline Bybit perp CSV parser — groups fills by Order No.
// Exact Bybit headers (note "Trasaction" typo):
// Market,Filled Type,Filled Quantity,Filled Price,Order Price,Fee Rate,Trading Fee,feeCoin,ExecFeeV2,Direction,Order Type,Trasaction ID,Order No.,Transaction Time(UTC+0)
function parseBybitCSV(content: string): { trades: ParsedTrade[]; debug: Record<string, unknown> } {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const dataLines = lines.slice(1).filter(l => l.trim());

  console.log('[bybit-csv] headers:', headers);
  console.log('[bybit-csv] data lines:', dataLines.length);

  const filledTypeIdx = headers.findIndex(h => h.toLowerCase() === 'filled type');
  const marketIdx     = headers.findIndex(h => h.toLowerCase() === 'market');
  const directionIdx  = headers.findIndex(h => h.toLowerCase() === 'direction');
  const filledPriceIdx = headers.findIndex(h => h.toLowerCase() === 'filled price');
  const filledQtyIdx  = headers.findIndex(h => h.toLowerCase() === 'filled quantity');
  const tradingFeeIdx = headers.findIndex(h => h.toLowerCase() === 'trading fee');
  const orderNoIdx    = headers.findIndex(h => h.toLowerCase() === 'order no.');
  const timeIdx       = headers.findIndex(h => h.toLowerCase() === 'transaction time(utc+0)');

  const debug: Record<string, unknown> = {
    headers,
    totalLines: dataLines.length,
    colIndices: { filledTypeIdx, marketIdx, directionIdx, filledPriceIdx, filledQtyIdx, tradingFeeIdx, orderNoIdx, timeIdx },
  };

  // Need at minimum: market, direction, filled price, filled qty
  if (marketIdx === -1 || directionIdx === -1 || filledPriceIdx === -1 || filledQtyIdx === -1) {
    debug['error'] = 'Missing required columns (Market, Direction, Filled Price, Filled Quantity)';
    return { trades: [], debug };
  }

  const orderGroups: Record<string, BybitOrderGroup> = {};
  let tradeRowCount = 0;
  let skippedRows = 0;

  for (const line of dataLines) {
    const cells = line.split(',').map(c => c.trim());
    const filledType = filledTypeIdx >= 0 ? (cells[filledTypeIdx] ?? '') : 'Trade';
    // Skip non-trade rows (Funding, AdlTrade, etc.)
    if (filledType && filledType.toLowerCase() !== 'trade') { skippedRows++; continue; }

    const market  = marketIdx >= 0 ? (cells[marketIdx] ?? '') : '';
    const dirRaw  = directionIdx >= 0 ? (cells[directionIdx] ?? '').toLowerCase() : '';
    const price   = parseFloat(cells[filledPriceIdx] ?? '');
    const qty     = parseFloat(cells[filledQtyIdx] ?? '');
    const fee     = tradingFeeIdx >= 0 ? Number(cells[tradingFeeIdx] ?? '0') : 0;
    const orderNo = orderNoIdx >= 0 ? (cells[orderNoIdx] ?? '').trim() : '';
    const dateStr = timeIdx >= 0 ? (cells[timeIdx] ?? '') : '';

    if (!market || !dirRaw || isNaN(price) || isNaN(qty) || qty === 0) continue;
    tradeRowCount++;

    // Direction: Buy/Long → long, Sell/Short → short
    const direction: 'long' | 'short' = ['buy', 'long'].includes(dirRaw) ? 'long' : 'short';
    const key = orderNo || `${market}|${price}|${dateStr}`;

    if (!orderGroups[key]) {
      orderGroups[key] = { symbol: addSlash(market), direction, price, totalQty: 0, totalFee: 0, date: dateStr };
    }
    orderGroups[key].totalQty += qty;
    orderGroups[key].totalFee += isNaN(fee) ? 0 : Math.abs(fee);
  }

  debug['tradeRowCount'] = tradeRowCount;
  debug['skippedRows'] = skippedRows;
  debug['orderGroups'] = Object.keys(orderGroups).length;

  const trades: ParsedTrade[] = Object.values(orderGroups).map(o => ({
    symbol: o.symbol,
    market: 'crypto' as const,
    direction: o.direction,
    entry_price: o.price,
    exit_price: null,
    position_size: o.totalQty,
    fees: o.totalFee,
    pnl: null,
    opened_at: parseBybitDate(o.date),
    closed_at: null,
    status: 'closed' as const,
  }));

  console.log('[bybit-csv] trades parsed:', trades.length, '| skipped rows:', skippedRows);
  return { trades, debug };
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const contentType = req.headers.get('content-type') ?? '';

  // ── Save mode: JSON body with pre-parsed trades ──────────────────────────
  if (contentType.includes('application/json')) {
    const { trades } = (await req.json()) as { trades: ParsedTrade[] };
    if (!Array.isArray(trades) || trades.length === 0) {
      return NextResponse.json({ error: 'No trades provided' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('trades')
      .select('symbol, entry_price, opened_at')
      .eq('user_id', user.id);

    const existingKeys = new Set(
      (existing ?? []).map(t => `${t.symbol}|${t.entry_price}|${new Date(t.opened_at).toISOString().slice(0, 16)}`)
    );

    const toInsert = trades
      .filter(t => !existingKeys.has(`${t.symbol}|${t.entry_price}|${new Date(t.opened_at).toISOString().slice(0, 16)}`))
      .map(t => ({ ...t, user_id: user.id }));

    const skipped = trades.length - toInsert.length;
    let imported = 0;
    for (let i = 0; i < toInsert.length; i += 50) {
      const { error } = await supabase.from('trades').insert(toInsert.slice(i, i + 50));
      if (!error) imported += Math.min(50, toInsert.length - i);
    }

    return NextResponse.json({ imported, skipped });
  }

  // ── Parse mode: multipart form data ─────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const format = (formData.get('format') as string | null) ?? '';

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded', trades: [] });
  }
  if (!format) {
    return NextResponse.json({ error: 'format is required', trades: [] });
  }

  const content = await file.text();
  const firstLine = content.split('\n')[0] ?? '';

  console.log('[import-csv] format:', format, '| size:', content.length, '| first line:', firstLine.substring(0, 120));

  let trades: ParsedTrade[];
  let debug: Record<string, unknown> = { format, fileSize: content.length, firstLine };

  try {
    if (format === 'bybit') {
      const result = parseBybitCSV(content);
      trades = result.trades;
      debug = { ...debug, ...result.debug };
    } else if (format === 'binance') {
      trades = parseBinance(content);
    } else if (format === 'metatrader') {
      trades = parseMetaTrader(content);
    } else {
      trades = parseGeneric(content);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to parse CSV';
    console.error('[import-csv] parse error:', msg);
    return NextResponse.json({ error: msg, trades: [], debug }, { status: 400 });
  }

  console.log('[import-csv] total trades:', trades.length);

  // Always return 200 — empty trades array is not an HTTP error, debug info tells the story
  if (trades.length === 0) {
    return NextResponse.json({
      trades: [],
      count: 0,
      error: 'No trades found. Check that you selected the correct format.',
      debug,
    });
  }

  return NextResponse.json({ trades, count: trades.length, debug });
}
