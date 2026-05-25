import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page      = Math.max(1, parseInt(searchParams.get('page')  || '1'));
  const limit     = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
  const search    = searchParams.get('search')     || '';
  const date_from = searchParams.get('date_from')  || '';
  const date_to   = searchParams.get('date_to')    || '';
  const direction = searchParams.get('direction')  || '';
  const pnl_filter = searchParams.get('pnl_filter') || 'all';

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Resolve user IDs for email search
  let userIds: string[] | null = null;
  if (search) {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('email', `%${search}%`);
    userIds = (profiles || []).map((p: any) => p.id);
    if (userIds.length === 0) {
      return NextResponse.json({ trades: [], total: 0, page, limit, pages: 0 });
    }
  }

  let query = supabaseAdmin
    .from('trades')
    .select('*, profiles(email, full_name, display_name)', { count: 'exact' });

  if (userIds)                              query = query.in('user_id', userIds);
  if (date_from)                            query = query.gte('opened_at', date_from);
  if (date_to)                              query = query.lte('opened_at', `${date_to}T23:59:59`);
  if (direction && direction !== 'all')     query = query.eq('direction', direction);
  if (pnl_filter === 'profit')              query = query.gt('pnl', 0);
  else if (pnl_filter === 'loss')           query = query.lt('pnl', 0);

  const from = (page - 1) * limit;
  const { data: trades, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    trades: trades || [],
    total:  count  || 0,
    page,
    limit,
    pages: Math.ceil((count || 0) / limit),
  });
}
