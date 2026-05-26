import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { sendAffiliateApproval } from '@/lib/email';

async function assertAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  return profile?.is_admin ? user : null;
}

export async function GET(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let query = admin
    .from('affiliate_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ applications: data || [] });
}

export async function PATCH(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const body = await req.json();
  const { id, status, admin_notes } = body;

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (status !== undefined) {
    updates.status = status;
    updates.reviewed_at = new Date().toISOString();
  }
  if (admin_notes !== undefined) updates.admin_notes = admin_notes;

  // Fetch application before update for email sending
  let application: { name: string; email: string } | null = null;
  if (status === 'approved' || status === 'rejected') {
    const { data } = await admin
      .from('affiliate_applications')
      .select('name, email')
      .eq('id', id)
      .single();
    application = data;
  }

  const { error } = await admin.from('affiliate_applications').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (status === 'approved' && application) {
    await sendAffiliateApproval(application.email, application.name);
  }

  return NextResponse.json({ ok: true });
}
