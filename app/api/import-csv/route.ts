import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseBybit, parseBinance, parseMetaTrader, parseGeneric, ParsedTrade } from '@/lib/csvParsers';

function extractBybitDebug(text: string): Record<string, unknown> {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  let hi = 0;
  while (hi < lines.length && (!lines[hi].trim() || lines[hi].trim().startsWith('#'))) hi++;
  const headers = hi < lines.length ? lines[hi].split(',').map(h => h.trim()) : [];
  const totalRows = lines.length - hi - 1;
  const filledTypeCol = headers.find(h => h.toLowerCase() === 'filled type') ?? null;
  const directionCol = headers.find(h => h.toLowerCase() === 'direction') ?? null;
  console.log('[import-csv] Bybit headers:', headers);
  console.log('[import-csv] Bybit total data rows:', totalRows);
  console.log('[import-csv] Bybit filledType col found:', filledTypeCol);
  console.log('[import-csv] Bybit direction col found:', directionCol);
  return { headers, totalRows, filledTypeCol, directionCol };
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const contentType = req.headers.get('content-type') ?? '';

  // Save mode: JSON body with pre-parsed trades
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
      .filter(t => {
        const key = `${t.symbol}|${t.entry_price}|${new Date(t.opened_at).toISOString().slice(0, 16)}`;
        return !existingKeys.has(key);
      })
      .map(t => ({ ...t, user_id: user.id }));

    const skipped = trades.length - toInsert.length;
    let imported = 0;
    for (let i = 0; i < toInsert.length; i += 50) {
      const { error } = await supabase.from('trades').insert(toInsert.slice(i, i + 50));
      if (!error) imported += Math.min(50, toInsert.length - i);
    }

    return NextResponse.json({ imported, skipped });
  }

  // Parse mode: multipart form data with CSV file
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const format = (formData.get('format') as string | null) ?? '';

  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  if (!format) return NextResponse.json({ error: 'format is required' }, { status: 400 });

  const text = await file.text();
  const firstLine = text.split('\n')[0] ?? '';

  console.log('[import-csv] Format:', format);
  console.log('[import-csv] File size (chars):', text.length);
  console.log('[import-csv] First 300 chars:', text.substring(0, 300));
  console.log('[import-csv] Header line:', firstLine);

  let trades: ParsedTrade[];
  let debugInfo: Record<string, unknown> = {};

  try {
    if (format === 'bybit') {
      debugInfo = extractBybitDebug(text);
      trades = parseBybit(text);
      console.log('[import-csv] Bybit trades after parse:', trades.length);
    } else if (format === 'binance') {
      trades = parseBinance(text);
    } else if (format === 'metatrader') {
      trades = parseMetaTrader(text);
    } else {
      trades = parseGeneric(text);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to parse CSV';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  console.log('[import-csv] Total trades parsed:', trades.length);

  if (trades.length === 0) {
    return NextResponse.json({
      error: 'No trades found. Check that you selected the correct format and exported the full trade history.',
      debug: { format, fileSize: text.length, firstLine, ...debugInfo },
    }, { status: 422 });
  }

  return NextResponse.json({ trades, count: trades.length });
}
