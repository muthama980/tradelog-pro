import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { issue_type, description, email } = await req.json();
  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 });
  }

  const { error } = await supabase.from('feedback').insert({
    user_id: user.id,
    issue_type: issue_type || 'other',
    description: description.trim(),
    email: email || user.email,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
