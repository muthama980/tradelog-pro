'use client';

import { useEffect, useState } from 'react';

const QUOTES = [
  { text: "The market can stay irrational longer than you can stay solvent.", author: "John Maynard Keynes" },
  { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
  { text: "The four most dangerous words in investing are: this time it's different.", author: "Sir John Templeton" },
  { text: "In trading, the impossible happens about twice a year.", author: "Henry Kaufman" },
  { text: "It's not whether you're right or wrong that's important — it's how much money you make when right and how much you lose when wrong.", author: "George Soros" },
  { text: "The trend is your friend until the end when it bends.", author: "Ed Seykota" },
  { text: "Be fearful when others are greedy, and greedy when others are fearful.", author: "Warren Buffett" },
  { text: "Markets are never wrong — opinions often are.", author: "Jesse Livermore" },
  { text: "There is nothing more important than your emotional balance.", author: "Jesse Livermore" },
  { text: "The goal of a successful trader is to make the best trades. Money is secondary.", author: "Alexander Elder" },
  { text: "If you can't take a small loss, sooner or later you will take the mother of all losses.", author: "Ed Seykota" },
  { text: "I'm only rich because I know when I'm wrong.", author: "George Soros" },
  { text: "Amateurs think about how much money they can make. Professionals think about how much money they could lose.", author: "Jack Schwager" },
  { text: "The stock market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett" },
  { text: "Don't focus on making money; focus on protecting what you have.", author: "Paul Tudor Jones" },
];

export default function DailyQuote({ variant = 'feature' }: { variant?: 'feature' | 'compact' }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    setIdx(seed % QUOTES.length);
  }, []);

  const q = QUOTES[idx];

  if (variant === 'compact') {
    return (
      <div className="card rounded-xl p-6 border-l-2 border-l-accent relative">
        <p className="text-base text-text leading-relaxed">
          "{q.text}"
        </p>
        <p className="mt-4 font-mono text-[11px] tracking-widest text-accent uppercase">
          — {q.author}
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mono-label mb-6">
        Daily Edge · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
      <div className="border-l-2 border-accent pl-8">
        <p className="text-2xl md:text-3xl font-medium text-text leading-[1.5] max-w-3xl">
          {q.text}
        </p>
        <p className="mt-6 font-mono text-[11px] tracking-widest text-accent uppercase">
          — {q.author}
        </p>
      </div>
    </div>
  );
}
