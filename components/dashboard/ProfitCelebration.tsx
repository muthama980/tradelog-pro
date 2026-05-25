'use client';

import { useEffect, useRef } from 'react';
import { Trophy, Share2 } from 'lucide-react';

interface ProfitCelebrationProps {
  pnl: number;
  symbol: string;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  strategy?: string;
  emotion?: string;
  session?: string;
  onClose: () => void;
}

const HEADINGS = [
  'Nice trade! 🎉',
  'Winner winner! 💰',
  'Green candle energy! 📈',
  "That's how it's done! 🔥",
  'Profit locked in! ✅',
];

const CONFETTI_COLORS = ['#00D9FF', '#22C55E', '#FBBF24', '#FAFAFA', '#EF4444'];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function ProfitCelebration({
  pnl, symbol, direction, entryPrice, exitPrice,
  strategy, emotion, session, onClose,
}: ProfitCelebrationProps) {
  const heading = useRef(HEADINGS[Math.floor(Math.random() * HEADINGS.length)]).current;
  const confetti = useRef(
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: rand(0, 100),
      delay: rand(0, 2),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    }))
  ).current;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const tradeDetails = [
    `📊 ${symbol} | ${direction}`,
    `Entry: ${entryPrice} → Exit: ${exitPrice}`,
    `P&L: +$${pnl.toFixed(2)} ✅`,
    strategy ? `Strategy: ${strategy}` : null,
    emotion  ? `Feeling: ${emotion}`   : null,
    session  ? `Session: ${session}`   : null,
    ``,
    `Tracked with TradeLog Pro — tradelogpro.xyz`,
  ].filter(Boolean).join('\n');

  const encodedDetails = encodeURIComponent(tradeDetails);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Confetti layer */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {confetti.map((c) => (
          <div
            key={c.id}
            style={{
              position: 'absolute',
              left: `${c.left}%`,
              top: 0,
              width: 8,
              height: 8,
              backgroundColor: c.color,
              borderRadius: 2,
              animationDelay: `${c.delay}s`,
              animationDuration: '3s',
              animationName: 'confetti-fall',
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards',
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div className="relative z-10 bg-[#111113] border border-[#1F1F23] rounded-2xl max-w-[420px] w-full p-8 text-center">
        <div className="flex justify-center mb-4">
          <Trophy size={48} color="#22C55E" strokeWidth={1.5} />
        </div>

        <h2 className="text-2xl font-bold text-text mb-2">{heading}</h2>

        <p className="text-3xl font-bold text-signal-green mb-1">
          +${pnl.toFixed(2)}
        </p>
        <p className="text-text-muted text-sm mb-4">{symbol}</p>

        <p className="text-text-muted text-sm mb-6">
          Keep the discipline going. Journal every trade.
        </p>

        {/* Share */}
        <div className="mb-6">
          <p className="text-text-muted text-sm mb-3">Share your win?</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodedDetails}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#18181B] hover:bg-[#1F1F23] border border-[#1F1F23] rounded-lg px-4 py-2 text-sm text-text-muted hover:text-text transition-colors"
            >
              <Share2 size={13} /> Twitter/X
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=https://tradelogpro.xyz&quote=${encodedDetails}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#18181B] hover:bg-[#1F1F23] border border-[#1F1F23] rounded-lg px-4 py-2 text-sm text-text-muted hover:text-text transition-colors"
            >
              <Share2 size={13} /> Facebook
            </a>
            <a
              href={`https://wa.me/?text=${encodedDetails}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#18181B] hover:bg-[#1F1F23] border border-[#1F1F23] rounded-lg px-4 py-2 text-sm text-text-muted hover:text-text transition-colors"
            >
              <Share2 size={13} /> WhatsApp
            </a>
          </div>
        </div>

        <button onClick={onClose} className="btn-secondary w-full justify-center">
          Continue
        </button>
      </div>
    </div>
  );
}
