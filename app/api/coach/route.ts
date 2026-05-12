import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Pro+ plan only
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
  if (!['pro', 'prop'].includes(profile?.plan || '')) {
    return NextResponse.json({ error: 'AI Coach requires Pro or Elite plan' }, { status: 403 });
  }

  // Get last 30 closed trades
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'closed')
    .gte('opened_at', since.toISOString())
    .order('opened_at', { ascending: true });

  if (!trades || trades.length < 5) {
    return NextResponse.json({ error: 'Need at least 5 closed trades to generate a report' }, { status: 400 });
  }

  // Build a compact summary for the LLM
  const tradeSummary = trades.map((t: any) => ({
    sym: t.symbol,
    dir: t.direction,
    strat: t.strategy,
    emo: t.emotion,
    pnl: Number(t.pnl || 0),
    date: t.opened_at,
  }));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Claude API not configured' }, { status: 500 });

  const prompt = `You are the AI Coach inside TradeLog Pro, a trading journal app.
The trader has just completed a week. Below is their last 30 closed trades.

YOUR JOB:
- Identify 2-3 concrete patterns (one positive, one negative, optionally one hidden)
- Cite specific numbers (win rate, R-multiple, P&L) for each pattern
- Be direct, plain, and actionable. No fluff. No financial advice.
- Speak to the trader as a sharp peer, not a guru.

OUTPUT JSON ONLY in this exact shape:
{
  "summary": "1-2 sentence executive summary",
  "patterns": [
    { "type": "working" | "leaking" | "hidden",
      "title": "string",
      "body":  "2-3 sentence analysis with specific numbers",
      "stats": { "winRate": "string", "avgR": "string", "netPnl": "string" }
    }
  ],
  "closing": "1 sentence closing line"
}

TRADES:
${JSON.stringify(tradeSummary, null, 2)}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: 'Coach generation failed', details: err }, { status: 500 });
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  let report;
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    report = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: 'Could not parse coach output', raw: text }, { status: 500 });
  }

  // Cache the report
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  await supabase.from('coach_reports').upsert({
    user_id: user.id,
    week_start: weekStart.toISOString().split('T')[0],
    summary: report.summary,
    patterns: report.patterns,
  });

  return NextResponse.json(report);
}
