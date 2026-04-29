import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const format = new URL(req.url).searchParams.get('format') || 'json';
  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .order('opened_at', { ascending: false });

  if (format === 'csv') {
    const headers = [
      'symbol','market','direction','entry_price','exit_price','position_size',
      'fees','pnl','r_multiple','strategy','emotion','status','opened_at','closed_at','notes',
    ];
    const rows = (trades || []).map((t: any) =>
      headers.map((h) => {
        const v = t[h] ?? '';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="tradelog-pro-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json(trades || []);
}
