import clsx, { type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(n: number) {
  const v = (n * 100).toFixed(1);
  return `${n >= 0 ? '+' : ''}${v}%`;
}

/** Compute P&L for a closed trade */
export function computePnl(t: {
  direction: 'long' | 'short';
  entry_price: number;
  exit_price: number;
  position_size: number;
  fees?: number;
}) {
  const dir = t.direction === 'long' ? 1 : -1;
  return dir * (t.exit_price - t.entry_price) * t.position_size - (t.fees || 0);
}
