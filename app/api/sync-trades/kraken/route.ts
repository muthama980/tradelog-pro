import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncKraken } from '@/lib/exchangeSync';

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const result = await syncKraken(supabase, user.id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ imported: result.imported });
}
