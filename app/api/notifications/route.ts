import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const query = supabase.from('notifications').update({ read: true }).eq('user_id', user.id);

  if (body.all) {
    await query;
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    await query.in('id', body.ids);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const query = supabase.from('notifications').delete().eq('user_id', user.id);

  if (body.all) {
    await query;
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    await query.in('id', body.ids);
  }

  return NextResponse.json({ ok: true });
}
