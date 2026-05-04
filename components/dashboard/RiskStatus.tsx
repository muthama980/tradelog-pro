'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, AlertTriangle, OctagonX } from 'lucide-react';

const TIPS = [
  "Winners take breaks. Losers chase losses.",
  "The best trade is sometimes no trade.",
  "Discipline is doing the same thing when the market is exciting.",
  "Size down when you're not sure. Size up when you're certain.",
  "A consistent small gain beats an inconsistent large one.",
  "Your job isn't to predict. Your job is to react.",
  "The market will be open tomorrow. Will you?",
  "Revenge trading is a gift to your broker.",
  "Emotions are information. Don't act on them — study them.",
  "A losing streak is a signal to review, not to double down.",
  "The edge isn't in more trades. It's in better trades.",
  "Protect the downside and the upside takes care of itself.",
  "Patience is a strategy. Impatience is a tax.",
  "One bad trade can undo ten good ones.",
  "You don't need to trade every day. The market doesn't take attendance.",
  "Stop-losses are not optional. They're the only reason you're still here.",
  "The best traders lose well. Anyone can win well.",
  "Journal everything. The data you ignore today will haunt you tomorrow.",
  "Three consecutive losses? Step away. The screen will still be there.",
  "Your biggest enemy in the market is the version of you that panics.",
  "A clean entry and a clean exit. Everything else is noise.",
  "Compounding requires staying in the game. Blowing up ends it.",
];

const NEGATIVE_EMOTIONS = new Set([
  'fomo','revenge','fear','greed','impatient','frustrated',
  'anxious','overconfident','bored','desperate','angry','euphoric',
]);

type StatusLevel = 'green' | 'yellow' | 'red';
interface RiskState { level: StatusLevel; headline: string; tip: string; }

function analyzeRisk(trades: any[]): RiskState {
  const tip = TIPS[new Date().getDate() % TIPS.length];

  if (trades.length === 0) {
    return { level: 'green', headline: 'No trades yet today — stay patient.', tip };
  }

  const closed   = trades.filter((t) => t.status === 'closed');
  const todayPnl = closed.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const count    = trades.length;
  const now      = Date.now();

  const recentTrades = trades.filter(
    (t) => now - new Date(t.opened_at).getTime() < 30 * 60 * 1000
  );

  // Consecutive losses from most recent
  let lossStreak = 0;
  for (const t of closed) {
    if (Number(t.pnl) < 0) lossStreak++;
    else break;
  }

  // Last 3 emotions
  const lastEmotions = trades.slice(0, 3).map((t) => t.emotion).filter(Boolean);
  const negEmoCount  = lastEmotions.filter((e: string) => NEGATIVE_EMOTIONS.has(e)).length;
  const hasRevenge   = lastEmotions.some((e: string) => e === 'revenge');

  // Peak P&L to detect giving back gains
  let peak = 0, cum = 0;
  for (const t of [...closed].reverse()) {
    cum += Number(t.pnl || 0);
    if (cum > peak) peak = cum;
  }

  // --- RED ---
  if (hasRevenge && negEmoCount >= 2) {
    return { level: 'red', headline: 'Revenge trading detected — step away from the screen.', tip };
  }
  if (lossStreak >= 3) {
    return { level: 'red', headline: `Stop trading. You've had ${lossStreak} losses in a row today.`, tip };
  }
  if (recentTrades.length >= 3 && closed.some((t) => Number(t.pnl) < 0)) {
    return { level: 'red', headline: `${recentTrades.length} trades in 30 minutes after a loss — that's tilt.`, tip };
  }
  if (negEmoCount >= 3) {
    return { level: 'red', headline: "You're on tilt — step away from the screen.", tip };
  }
  if (todayPnl < -200 && closed.length >= 3) {
    return { level: 'red', headline: `Daily drawdown alert — you're down $${Math.abs(todayPnl).toFixed(0)} today.`, tip };
  }

  // --- YELLOW ---
  if (lossStreak >= 2) {
    return { level: 'yellow', headline: 'Consider stepping away — 2 losses in a row.', tip };
  }
  if (count > 7) {
    return { level: 'yellow', headline: `Slow down — you've taken ${count} trades today.`, tip };
  }
  if (count > 5) {
    return { level: 'yellow', headline: "Careful not to overtrade — you're above your daily trade count.", tip };
  }
  if (negEmoCount >= 2) {
    const emo = lastEmotions.slice(0, 2).join(' & ');
    return { level: 'yellow', headline: `Watch your emotions — last 2 trades tagged ${emo}.`, tip };
  }
  if (peak > 50 && todayPnl < peak * 0.5) {
    return {
      level: 'yellow',
      headline: `You're giving back profits — P&L dropped from +$${peak.toFixed(0)} to +$${todayPnl.toFixed(0)}.`,
      tip,
    };
  }

  // --- GREEN ---
  const allClean = trades.every((t) => !t.emotion || !NEGATIVE_EMOTIONS.has(t.emotion));
  if (allClean && todayPnl > 0 && count <= 3) {
    return { level: 'green', headline: "You're in the zone — clean, profitable session so far.", tip };
  }
  if (closed.filter((t) => Number(t.pnl) > 0).length >= 2 && lossStreak === 0) {
    return { level: 'green', headline: 'Solid session so far — keep the discipline.', tip };
  }
  return { level: 'green', headline: 'Clean trading today — stay focused.', tip };
}

const COLORS = {
  green:  { border: 'border-signal-green/30', bg: 'bg-signal-green/8',  text: 'text-signal-green', dot: 'bg-signal-green' },
  yellow: { border: 'border-yellow-500/30',   bg: 'bg-yellow-500/8',    text: 'text-yellow-400',   dot: 'bg-yellow-400'   },
  red:    { border: 'border-signal-red/30',   bg: 'bg-signal-red/8',    text: 'text-signal-red',   dot: 'bg-signal-red'   },
};

export default function RiskStatus() {
  const supabase = createClient();
  const [state, setState] = useState<RiskState | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('opened_at', today.toISOString())
        .order('opened_at', { ascending: false });
      setState(analyzeRisk(data || []));
    }
    load();
  }, []);

  if (!state) return null;

  const c    = COLORS[state.level];
  const Icon = state.level === 'green' ? ShieldCheck : state.level === 'yellow' ? AlertTriangle : OctagonX;

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4 flex items-start gap-4 mb-8`}>
      <div className="relative shrink-0 flex items-center justify-center w-6 h-6 mt-0.5">
        <span className={`absolute inset-0 rounded-full ${c.dot} opacity-25 animate-ping`} />
        <Icon className={c.text} size={20} strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${c.text}`}>{state.headline}</p>
        <p className="text-text-dim text-xs mt-1 italic">"{state.tip}"</p>
      </div>
    </div>
  );
}
