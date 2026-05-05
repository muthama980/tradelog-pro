import Papa from 'papaparse';
import { computePnl } from './utils';

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

export type ExchangeCard = 'binance' | 'bybit' | 'metatrader' | 'generic';
type ExchangeFormat = 'binance-spot' | 'binance-futures' | 'bybit-spot' | 'bybit-futures' | 'metatrader' | 'generic';

export interface ColumnMapping {
  date: string | null;
  symbol: string | null;
  side: string | null;
  entry_price: string | null;
  exit_price: string | null;
  position_size: string | null;
  fees: string | null;
  pnl: string | null;
  closed_at: string | null;
}

export interface ParseResult {
  trades: ParsedTrade[];
  headers: string[];
  detectedFormat: ExchangeFormat;
  columnMapping: ColumnMapping;
  needsMapping: boolean;
}

type Row = Record<string, string>;

const CRYPTO_QUOTES = ['USDT', 'USDC', 'BUSD', 'FDUSD', 'DAI', 'BTC', 'ETH', 'BNB', 'USD', 'EUR', 'GBP', 'TRY', 'AUD', 'JPY'];

function addSlashCrypto(symbol: string): string {
  if (!symbol) return '';
  const s = symbol.trim().toUpperCase();
  if (s.includes('/')) return s;
  for (const q of CRYPTO_QUOTES) {
    if (s.endsWith(q) && s.length > q.length + 1) return `${s.slice(0, -q.length)}/${q}`;
  }
  return s;
}

function addSlashForex(symbol: string): string {
  if (!symbol) return '';
  const s = symbol.trim().toUpperCase();
  if (s.includes('/')) return s;
  if (s.length === 6) return `${s.slice(0, 3)}/${s.slice(3)}`;
  return s;
}

function toIso(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  // MT4/5 dot format: "2024.01.15 09:30:00"
  const d1 = new Date(dateStr.replace(/(\d{4})\.(\d{2})\.(\d{2}) /, '$1-$2-$3T'));
  if (!isNaN(d1.getTime())) return d1.toISOString();
  const d2 = new Date(dateStr);
  if (!isNaN(d2.getTime())) return d2.toISOString();
  // "YYYY-MM-DD HH:mm:ss" without T
  const d3 = new Date(dateStr.replace(' ', 'T') + 'Z');
  if (!isNaN(d3.getTime())) return d3.toISOString();
  return new Date().toISOString();
}

function n(v: string | undefined): number {
  if (!v) return 0;
  return parseFloat(v.replace(/[,\s]/g, '')) || 0;
}

function detectFormat(headers: string[]): ExchangeFormat {
  const h = new Set(headers.map(x => x.toLowerCase().trim()));
  if (h.has('realized profit')) return 'binance-futures';
  if (h.has('pair') || h.has('date(utc)')) return 'binance-spot';
  if (h.has('exec price') || h.has('closed pnl') || h.has('exec qty')) return 'bybit-futures';
  if (h.has('avg. filled price') || h.has('order type') || h.has('trading fee')) return 'bybit-spot';
  if ((h.has('ticket') && h.has('close price')) || (h.has('open time') && h.has('close time'))) return 'metatrader';
  return 'generic';
}

interface OpenOrder { date: string; price: number; size: number; fee: number }

function matchOrders(
  symbol: string,
  orders: { date: string; side: string; price: number; size: number; fee: number }[],
): ParsedTrade[] {
  const trades: ParsedTrade[] = [];
  const openLongs: OpenOrder[] = [];
  const openShorts: OpenOrder[] = [];

  for (const o of orders) {
    const side = o.side.toUpperCase();
    if (side === 'BUY') {
      if (openShorts.length > 0) {
        const entry = openShorts.shift()!;
        const size = Math.min(entry.size, o.size);
        const fees = entry.fee + o.fee;
        trades.push({
          symbol, direction: 'short', market: 'crypto',
          entry_price: entry.price, exit_price: o.price, position_size: size, fees,
          pnl: computePnl({ direction: 'short', entry_price: entry.price, exit_price: o.price, position_size: size, fees }),
          opened_at: toIso(entry.date), closed_at: toIso(o.date), status: 'closed',
        });
      } else {
        openLongs.push({ date: o.date, price: o.price, size: o.size, fee: o.fee });
      }
    } else if (side === 'SELL') {
      if (openLongs.length > 0) {
        const entry = openLongs.shift()!;
        const size = Math.min(entry.size, o.size);
        const fees = entry.fee + o.fee;
        trades.push({
          symbol, direction: 'long', market: 'crypto',
          entry_price: entry.price, exit_price: o.price, position_size: size, fees,
          pnl: computePnl({ direction: 'long', entry_price: entry.price, exit_price: o.price, position_size: size, fees }),
          opened_at: toIso(entry.date), closed_at: toIso(o.date), status: 'closed',
        });
      } else {
        openShorts.push({ date: o.date, price: o.price, size: o.size, fee: o.fee });
      }
    }
  }

  for (const pos of openLongs) {
    trades.push({ symbol, direction: 'long', market: 'crypto', entry_price: pos.price, exit_price: null, position_size: pos.size, fees: pos.fee, pnl: null, opened_at: toIso(pos.date), closed_at: null, status: 'open' });
  }
  for (const pos of openShorts) {
    trades.push({ symbol, direction: 'short', market: 'crypto', entry_price: pos.price, exit_price: null, position_size: pos.size, fees: pos.fee, pnl: null, opened_at: toIso(pos.date), closed_at: null, status: 'open' });
  }
  return trades;
}

function parseBinanceSpot(rows: Row[]): ParsedTrade[] {
  const bySymbol: Record<string, { date: string; side: string; price: number; size: number; fee: number }[]> = {};
  for (const row of rows) {
    const symbol = addSlashCrypto(row['Pair'] || '');
    if (!symbol || !n(row['Price'])) continue;
    (bySymbol[symbol] ||= []).push({ date: row['Date(UTC)'] || '', side: row['Side'] || '', price: n(row['Price']), size: n(row['Executed']), fee: n(row['Fee']) });
  }
  return Object.entries(bySymbol).flatMap(([sym, orders]) => matchOrders(sym, orders));
}

function parseBinanceFutures(rows: Row[]): ParsedTrade[] {
  return rows.flatMap(row => {
    const symbol = addSlashCrypto(row['Symbol'] || '');
    const price = n(row['Price']);
    if (!symbol || !price) return [];
    const side = (row['Side'] || '').toUpperCase();
    const qty = n(row['Quantity']);
    const fee = n(row['Fee']);
    const realizedProfit = n(row['Realized Profit']);
    const isClosed = Math.abs(realizedProfit) > 0;
    const direction: 'long' | 'short' = side === 'BUY' ? 'long' : 'short';
    return [{
      symbol, market: 'crypto' as const, direction,
      entry_price: price, exit_price: isClosed ? price : null,
      position_size: qty, fees: fee,
      pnl: isClosed ? realizedProfit : null,
      opened_at: toIso(row['Date'] || ''),
      closed_at: isClosed ? toIso(row['Date'] || '') : null,
      status: (isClosed ? 'closed' : 'open') as 'closed' | 'open',
    }];
  });
}

function parseBybitSpot(rows: Row[]): ParsedTrade[] {
  const bySymbol: Record<string, { date: string; side: string; price: number; size: number; fee: number }[]> = {};
  for (const row of rows) {
    const symbol = addSlashCrypto(row['Symbol'] || '');
    if (!symbol || !n(row['Avg. Filled Price'])) continue;
    (bySymbol[symbol] ||= []).push({ date: row['Order Time'] || '', side: row['Side'] || '', price: n(row['Avg. Filled Price']), size: n(row['Filled']), fee: n(row['Trading Fee']) });
  }
  return Object.entries(bySymbol).flatMap(([sym, orders]) => matchOrders(sym, orders));
}

function parseBybitFutures(rows: Row[]): ParsedTrade[] {
  return rows.flatMap(row => {
    const symbol = addSlashCrypto(row['Symbol'] || '');
    const price = n(row['Exec Price']);
    if (!symbol || !price) return [];
    const side = (row['Side'] || '').toLowerCase();
    const qty = n(row['Exec Qty']);
    const fee = n(row['Exec Fee']);
    const closedPnl = n(row['Closed PnL']);
    const isClosed = Math.abs(closedPnl) > 0;
    const direction: 'long' | 'short' = side === 'buy' ? 'long' : 'short';
    return [{
      symbol, market: 'crypto' as const, direction,
      entry_price: price, exit_price: isClosed ? price : null,
      position_size: qty, fees: fee,
      pnl: isClosed ? closedPnl : null,
      opened_at: toIso(row['Create Time'] || ''),
      closed_at: isClosed ? toIso(row['Create Time'] || '') : null,
      status: (isClosed ? 'closed' : 'open') as 'closed' | 'open',
    }];
  });
}

function parseMetaTrader(rows: Row[]): ParsedTrade[] {
  return rows.flatMap(row => {
    const symbol = addSlashForex(row['Symbol'] || '');
    const entryPrice = n(row['Price']);
    if (!symbol || !entryPrice) return [];
    const type = (row['Type'] || '').toLowerCase();
    const direction: 'long' | 'short' = type.includes('buy') ? 'long' : 'short';
    const size = n(row['Size']) * 100000;
    const commission = n(row['Commission']);
    const swap = n(row['Swap']);
    const fees = commission + swap;
    const profit = n(row['Profit']);
    const exitPrice = n(row['Close Price']);
    const hasExit = exitPrice > 0;
    return [{
      symbol, market: 'forex' as const, direction,
      entry_price: entryPrice, exit_price: hasExit ? exitPrice : null,
      position_size: size, fees,
      pnl: hasExit ? profit : null,
      opened_at: toIso(row['Open Time'] || ''),
      closed_at: hasExit ? toIso(row['Close Time'] || '') : null,
      status: (hasExit ? 'closed' : 'open') as 'closed' | 'open',
    }];
  });
}

export function autoDetectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { date: null, symbol: null, side: null, entry_price: null, exit_price: null, position_size: null, fees: null, pnl: null, closed_at: null };
  const patterns: Record<keyof ColumnMapping, RegExp> = {
    date: /^(date|time|datetime|opened_at|open[\s_-]?time|order[\s_-]?time|create[\s_-]?time)/i,
    symbol: /^(symbol|pair|ticker|instrument)/i,
    side: /^(side|direction|type|order[\s_-]?type)/i,
    entry_price: /^(entry|entry[\s_-]?price|open[\s_-]?price|price|exec[\s_-]?price|avg.*price|filled[\s_-]?price)/i,
    exit_price: /^(exit|exit[\s_-]?price|close[\s_-]?price|take[\s_-]?profit)/i,
    position_size: /^(size|quantity|qty|executed|filled|volume|amount|position[\s_-]?size|exec[\s_-]?qty)/i,
    fees: /^(fee|fees|commission|trading[\s_-]?fee|exec[\s_-]?fee)/i,
    pnl: /^(pnl|profit|loss|p&l|realized[\s_-]?profit|closed[\s_-]?pnl|net[\s_-]?profit)/i,
    closed_at: /^(closed_at|close[\s_-]?time|exit[\s_-]?time)/i,
  };
  for (const header of headers) {
    for (const [field, pattern] of Object.entries(patterns) as [keyof ColumnMapping, RegExp][]) {
      if (!mapping[field] && pattern.test(header.trim())) mapping[field] = header;
    }
  }
  return mapping;
}

export function isValidMapping(m: ColumnMapping): boolean {
  return !!(m.date && m.symbol && m.side && m.entry_price);
}

function parseGenericCSV(rows: Row[], mapping: ColumnMapping): ParsedTrade[] {
  return rows.flatMap(row => {
    const symbol = mapping.symbol ? (row[mapping.symbol] || '').toUpperCase() : '';
    const entryPrice = mapping.entry_price ? n(row[mapping.entry_price]) : 0;
    if (!symbol || !entryPrice) return [];
    const sideRaw = (mapping.side ? row[mapping.side] || '' : '').toLowerCase();
    const direction: 'long' | 'short' = sideRaw.includes('buy') || sideRaw.includes('long') ? 'long' : 'short';
    const exitPrice = mapping.exit_price ? (n(row[mapping.exit_price]) || null) : null;
    const size = mapping.position_size ? n(row[mapping.position_size]) : 1;
    const fees = mapping.fees ? n(row[mapping.fees]) : 0;
    const pnlRaw = mapping.pnl ? n(row[mapping.pnl]) : null;
    const pnl = pnlRaw ? pnlRaw : (exitPrice ? computePnl({ direction, entry_price: entryPrice, exit_price: exitPrice, position_size: size, fees }) : null);
    const openedAt = mapping.date ? toIso(row[mapping.date]) : new Date().toISOString();
    const closedAt = mapping.closed_at ? toIso(row[mapping.closed_at]) : (exitPrice ? openedAt : null);
    return [{
      symbol, market: 'other' as const, direction,
      entry_price: entryPrice, exit_price: exitPrice, position_size: size, fees, pnl,
      opened_at: openedAt, closed_at: closedAt,
      status: (exitPrice ? 'closed' : 'open') as 'closed' | 'open',
    }];
  });
}

export function parseCSVFile(content: string, exchangeCard: ExchangeCard, customMapping?: ColumnMapping): ParseResult {
  const result = Papa.parse<Row>(content, { header: true, skipEmptyLines: true, dynamicTyping: false });
  const headers = result.meta.fields || [];
  const rows = result.data;

  const detectedFormat: ExchangeFormat =
    exchangeCard === 'metatrader' ? 'metatrader' : detectFormat(headers);

  const columnMapping = autoDetectColumns(headers);
  const needsMapping = detectedFormat === 'generic' && !isValidMapping(columnMapping) && !customMapping;
  if (needsMapping) return { trades: [], headers, detectedFormat, columnMapping, needsMapping: true };

  let trades: ParsedTrade[] = [];
  switch (detectedFormat) {
    case 'binance-spot':    trades = parseBinanceSpot(rows);   break;
    case 'binance-futures': trades = parseBinanceFutures(rows); break;
    case 'bybit-spot':     trades = parseBybitSpot(rows);     break;
    case 'bybit-futures':  trades = parseBybitFutures(rows);  break;
    case 'metatrader':     trades = parseMetaTrader(rows);    break;
    case 'generic':        trades = parseGenericCSV(rows, customMapping || columnMapping); break;
  }

  return { trades, headers, detectedFormat, columnMapping, needsMapping: false };
}
