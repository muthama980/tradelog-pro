import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncCoinbase } from '@/lib/exchangeSync';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!rateLimit(`${user.id}:sync`, 5)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  const result = await syncCoinbase(supabase, user.id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ imported: result.imported });
}
