export interface ParsedTrade {
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
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  let hi = 0;
  while (hi < lines.length && (!lines[hi].trim() || lines[hi].trim().startsWith('#'))) hi++;
  if (hi >= lines.length) return { headers: [], rows: [] };
  const headers = splitCSVLine(lines[hi]).map(h => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = hi + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (vals[idx] ?? '').trim(); });
    rows.push(row);
  }
  return { headers, rows };
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

function toISO(str: string): string {
  if (!str) return new Date().toISOString();
  // Handle time-first Bybit format: "HH:MM[:SS] YYYY-MM-DD"
  const timeFirst = str.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(\d{4}-\d{2}-\d{2})$/);
  if (timeFirst) {
    const time = timeFirst[1].length === 5 ? timeFirst[1] + ':00' : timeFirst[1];
    const d = new Date(`${timeFirst[2]}T${time}Z`);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const normalized = str.replace(' ', 'T');
  const d = new Date(normalized.endsWith('Z') ? normalized : normalized + 'Z');
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// Bybit perpetual export
// Headers (exact, including Bybit's typo "Trasaction ID"):
// Market,Filled Type,Filled Quantity,Filled Price,Order Price,Fee Rate,Trading Fee,feeCoin,ExecFeeV2,Direction,Order Type,Trasaction ID,Order No.,Transaction Time(UTC+0)
export function parseBybit(text: string): ParsedTrade[] {
  const { rows } = parseCSV(text);
  // Only process rows where Filled Type is "Trade" (skip Funding, AdlTrade, etc.)
  const tradeRows = rows.filter(row => {
    const ft = (row['Filled Type'] ?? '').toLowerCase().trim();
    return ft === 'trade' || ft === '';  // empty = older exports without this column
  });
  console.log('[parseBybit] total rows:', rows.length, 'trade rows:', tradeRows.length);
  return tradeRows.flatMap(row => {
    const symbol = addSlash(row['Market'] ?? '');
    const dir = (row['Direction'] ?? '').toLowerCase().trim();
    if (!symbol || !['buy', 'sell', 'long', 'short'].includes(dir)) return [];
    const entryPrice = parseFloat(row['Filled Price'] ?? '');
    const qty = parseFloat(row['Filled Quantity'] ?? '');
    // Trading Fee may be in scientific notation e.g. "5.5E-4" — Number() handles it
    const feeRaw = row['Trading Fee'] ?? '0';
    const fee = Number(feeRaw);
    if (isNaN(entryPrice) || isNaN(qty) || qty === 0) return [];
    return [{
      symbol,
      market: 'crypto' as const,
      direction: ['buy', 'long'].includes(dir) ? 'long' as const : 'short' as const,
      entry_price: entryPrice,
      exit_price: null,
      position_size: qty,
      fees: isNaN(fee) ? 0 : Math.abs(fee),
      pnl: null,
      opened_at: toISO(row['Transaction Time(UTC+0)'] ?? ''),
      closed_at: null,
      status: 'closed' as const,
    }];
  });
}

// Binance spot/futures trade history export
// Typical headers: Date(UTC),Pair,Side,Price,Executed,Amount,Fee
export function parseBinance(text: string): ParsedTrade[] {
  const { rows } = parseCSV(text);
  return rows.flatMap(row => {
    const symbol = addSlash(row['Pair'] ?? row['Symbol'] ?? '');
    const side = (row['Side'] ?? row['Type'] ?? '').toLowerCase();
    if (!symbol || !['buy', 'sell'].includes(side)) return [];
    const entryPrice = parseFloat(row['Price'] ?? row['AvgTrading Price'] ?? '');
    const qty = parseFloat(row['Executed'] ?? row['Filled'] ?? '');
    const fee = parseFloat(row['Fee'] ?? '0');
    if (isNaN(entryPrice) || isNaN(qty) || qty === 0) return [];
    return [{
      symbol,
      market: 'crypto' as const,
      direction: side === 'buy' ? 'long' as const : 'short' as const,
      entry_price: entryPrice,
      exit_price: null,
      position_size: qty,
      fees: isNaN(fee) ? 0 : Math.abs(fee),
      pnl: null,
      opened_at: toISO(row['Date(UTC)'] ?? row['Date'] ?? ''),
      closed_at: null,
      status: 'closed' as const,
    }];
  });
}

// MetaTrader 4/5 account history export
// MT4 headers: Ticket,Open Time,Type,Size,Symbol,Open Price,S/L,T/P,Close Time,Close Price,Commission,Taxes,Swap,Profit
// MT5 headers: Position,Time,Symbol,Type,Volume,Price,S/L,T/P,Profit,Balance
export function parseMetaTrader(text: string): ParsedTrade[] {
  const { rows } = parseCSV(text);
  return rows.flatMap(row => {
    const type = (row['Type'] ?? '').toLowerCase();
    if (!['buy', 'sell'].includes(type)) return [];
    const symbol = (row['Symbol'] ?? row['Item'] ?? '').trim();
    if (!symbol) return [];
    const entryPrice = parseFloat(row['Open Price'] ?? row['Price'] ?? '');
    const exitPrice = parseFloat(row['Close Price'] ?? '');
    const size = parseFloat(row['Size'] ?? row['Volume'] ?? row['Lots'] ?? '');
    if (isNaN(entryPrice) || isNaN(size) || size === 0) return [];
    const commission = parseFloat(row['Commission'] ?? '0') || 0;
    const swap = parseFloat(row['Swap'] ?? '0') || 0;
    const fees = Math.abs(commission) + Math.abs(swap);
    const profitStr = row['Profit'] ?? '';
    const pnl = profitStr !== '' && !isNaN(parseFloat(profitStr)) ? parseFloat(profitStr) : null;
    const openedAt = toISO(row['Open Time'] ?? row['Time'] ?? '');
    const closedAtStr = row['Close Time'] ?? '';
    const closedAt = closedAtStr ? toISO(closedAtStr) : null;
    const sym = symbol.toUpperCase();
    let market: ParsedTrade['market'] = 'other';
    if (/BTC|ETH|SOL|BNB|XRP|ADA|DOT|MATIC|AVAX|LINK/.test(sym)) market = 'crypto';
    else if (sym.length === 6 && /USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD/.test(sym)) market = 'forex';
    else if (/US30|NAS100|SPX500|DAX|XAUUSD|GOLD|OIL|BRENT/.test(sym)) market = 'futures';
    else if (sym.length <= 5 && /^[A-Z]+$/.test(sym)) market = 'stocks';
    return [{
      symbol,
      market,
      direction: type === 'buy' ? 'long' as const : 'short' as const,
      entry_price: entryPrice,
      exit_price: !isNaN(exitPrice) && exitPrice > 0 ? exitPrice : null,
      position_size: size,
      fees,
      pnl,
      opened_at: openedAt,
      closed_at: closedAt,
      status: closedAt ? 'closed' as const : 'open' as const,
    }];
  });
}

// Generic CSV — tries to auto-detect columns by common names
export function parseGeneric(text: string): ParsedTrade[] {
  const { headers, rows } = parseCSV(text);

  function findHeader(...candidates: string[]): string | undefined {
    for (const c of candidates) {
      const exact = headers.find(h => h.toLowerCase() === c.toLowerCase());
      if (exact) return exact;
      const partial = headers.find(h => h.toLowerCase().includes(c.toLowerCase()));
      if (partial) return partial;
    }
    return undefined;
  }

  const symbolH = findHeader('symbol', 'pair', 'ticker', 'instrument', 'market', 'asset');
  const sideH   = findHeader('side', 'direction', 'type', 'action');
  const entryH  = findHeader('entry price', 'open price', 'entry', 'open', 'price');
  const exitH   = findHeader('exit price', 'close price', 'exit', 'close');
  const sizeH   = findHeader('size', 'qty', 'quantity', 'volume', 'lot', 'executed', 'amount');
  const feeH    = findHeader('fee', 'commission', 'fees');
  const pnlH    = findHeader('pnl', 'profit', 'p&l', 'gain', 'net');
  const openH   = findHeader('date', 'time', 'opened at', 'open time', 'entry time', 'datetime');
  const closeH  = findHeader('closed at', 'close time', 'exit time', 'close date');

  if (!symbolH || !entryH) return [];

  return rows.flatMap(row => {
    const symbol = (row[symbolH] ?? '').trim();
    if (!symbol) return [];
    const entryPrice = parseFloat(row[entryH] ?? '');
    if (isNaN(entryPrice)) return [];
    const qty = sizeH ? parseFloat(row[sizeH] ?? '') : 1;
    if (isNaN(qty) || qty === 0) return [];
    const side = sideH ? (row[sideH] ?? '').toLowerCase() : 'buy';
    const direction: 'long' | 'short' = ['sell', 'short', 's'].includes(side) ? 'short' : 'long';
    const exitRaw = exitH ? parseFloat(row[exitH] ?? '') : NaN;
    const exitPrice = !isNaN(exitRaw) && exitRaw > 0 ? exitRaw : null;
    const feeRaw = feeH ? parseFloat(row[feeH] ?? '0') : 0;
    const fees = isNaN(feeRaw) ? 0 : Math.abs(feeRaw);
    const pnlRaw = pnlH ? parseFloat(row[pnlH] ?? '') : NaN;
    const pnl = !isNaN(pnlRaw) ? pnlRaw : null;
    const openedAt = openH ? toISO(row[openH] ?? '') : new Date().toISOString();
    const closedAtStr = closeH ? (row[closeH] ?? '') : '';
    const closedAt = closedAtStr ? toISO(closedAtStr) : null;
    const sym = symbol.toUpperCase();
    let market: ParsedTrade['market'] = 'other';
    if (/BTC|ETH|SOL|BNB|XRP|USDT|USDC/.test(sym) || sym.includes('/')) market = 'crypto';
    else if (sym.length === 6 && /USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD/.test(sym)) market = 'forex';
    else if (sym.length <= 5 && /^[A-Z]+$/.test(sym)) market = 'stocks';
    return [{
      symbol,
      market,
      direction,
      entry_price: entryPrice,
      exit_price: exitPrice,
      position_size: qty,
      fees,
      pnl,
      opened_at: openedAt,
      closed_at: closedAt,
      status: closedAt ? 'closed' as const : 'open' as const,
    }];
  });
}
