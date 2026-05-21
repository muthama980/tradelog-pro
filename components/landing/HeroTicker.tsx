'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

interface TickerItem {
  sym: string;
  px: string;
  chg: string;
  up: boolean;
  live: boolean;
}

const STATIC_TICKER_DATA: TickerItem[] = [
  { sym: 'BTC',    px: '94,812', chg: '+2.41%', up: true,  live: true  },
  { sym: 'ETH',    px: '3,284',  chg: '-0.87%', up: false, live: true  },
  { sym: 'EURUSD', px: '1.0834', chg: '+0.12%', up: true,  live: false },
  { sym: 'GBPJPY', px: '193.21', chg: '-0.34%', up: false, live: false },
  { sym: 'XAUUSD', px: '2,742',  chg: '+0.94%', up: true,  live: false },
  { sym: 'SOL',    px: '178.45', chg: '+5.12%', up: true,  live: true  },
  { sym: 'NAS100', px: '20,847', chg: '+0.61%', up: true,  live: false },
  { sym: 'USDJPY', px: '154.28', chg: '-0.22%', up: false, live: false },
];

const COIN_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
};

function formatCryptoPrice(value: number): string {
  if (value >= 10000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 100) return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value.toFixed(2);
}

export default function HeroTicker() {
  const [tickerData, setTickerData] = useState<TickerItem[]>(STATIC_TICKER_DATA);
  const [justUpdated, setJustUpdated] = useState(false);

  const fetchCryptoPrices = useCallback(async () => {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true',
        { cache: 'no-store' }
      );
      if (!res.ok) return;
      const data = await res.json();

      setTickerData(prev => prev.map(t => {
        const coinId = COIN_IDS[t.sym];
        if (!coinId || !data[coinId]) return t;
        const price: number = data[coinId].usd;
        const change: number = data[coinId].usd_24h_change ?? 0;
        return {
          ...t,
          px: formatCryptoPrice(price),
          chg: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
          up: change >= 0,
        };
      }));

      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 800);
    } catch {
      // API failed — static fallback already in state
    }
  }, []);

  useEffect(() => {
    fetchCryptoPrices();
    const id = setInterval(fetchCryptoPrices, 30_000);
    return () => clearInterval(id);
  }, [fetchCryptoPrices]);

  return (
    <div className="border-t border-border bg-bg py-2.5 overflow-hidden">
      <div className="ticker-track gap-10 px-6">
        {[...tickerData, ...tickerData, ...tickerData].map((t, i) => (
          <div key={i} className="flex items-center gap-2.5 shrink-0">
            <span className="font-mono text-[10px] tracking-widest text-text-dim">{t.sym}</span>
            <span className={`font-mono text-[11px] tabular transition-colors duration-300 ${
              t.live && justUpdated ? 'text-accent' : 'text-text'
            }`}>
              {t.px}
            </span>
            <span className={`font-mono text-[10px] tabular flex items-center gap-1 ${t.up ? 'text-signal-green' : 'text-signal-red'}`}>
              {t.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
              {t.chg}
            </span>
            {t.live && (
              <span className={`w-1 h-1 rounded-full shrink-0 transition-colors duration-300 ${
                justUpdated ? 'bg-accent' : 'bg-accent/30'
              }`} />
            )}
            <span className="text-text-dim/30">·</span>
          </div>
        ))}
      </div>
    </div>
  );
}
