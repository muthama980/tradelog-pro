import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseBinance, parseMetaTrader, parseGeneric, ParsedTrade } from '@/lib/csvParsers';

function addSlash(sym: string): string {
  for (const q of ['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'BNB']) {
    if (sym.endsWith(q) && sym.length > q.length + 1) return sym.slice(0, -q.length) + '/' + q;
  }
  return sym;
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
    if (format === 'binance') {
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
