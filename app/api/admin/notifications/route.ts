import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { sendNotificationEmail } from '@/lib/email';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getAdminUser() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = adminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) return null;
  return user;
}

// GET: user search (?q=email) or notification history
export async function GET(req: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = adminClient();
  const q = new URL(req.url).searchParams.get('q');

  if (q !== null) {
    const { data } = await admin
      .from('profiles')
      .select('id, email, full_name')
      .ilike('email', `%${q}%`)
      .limit(10);
    return NextResponse.json(data ?? []);
  }

  const { data } = await admin
    .from('admin_notification_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  return NextResponse.json(data ?? []);
}

// POST: send notification to all users or a specific user
export async function POST(req: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { to, title, message, type, link, sendEmail } = body;

  if (!title?.trim() || !message?.trim() || !type) {
    return NextResponse.json({ error: 'title, message, and type are required' }, { status: 400 });
  }

  const admin = adminClient();
  let count = 0;

  if (to === 'all') {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, email, full_name');

    const users = profiles ?? [];

    await Promise.allSettled(
      users.map(u =>
        admin.rpc('insert_notification', {
          p_user_id: u.id,
          p_title:   title,
          p_message: message,
          p_type:    type,
          p_link:    link || null,
        })
      )
    );

    if (sendEmail) {
      await Promise.allSettled(
        users.map(u => {
          const firstName = u.full_name?.split(' ')[0] || u.email?.split('@')[0] || 'Trader';
          return sendNotificationEmail(u.email, firstName, title, message, link || undefined);
        })
      );
    }

    count = users.length;
  } else {
    const { data: profile } = await admin
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', to)
      .single();

    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    await admin.rpc('insert_notification', {
      p_user_id: to,
      p_title:   title,
      p_message: message,
      p_type:    type,
      p_link:    link || null,
    });

    if (sendEmail && profile.email) {
      const firstName = profile.full_name?.split(' ')[0] || profile.email?.split('@')[0] || 'Trader';
      await sendNotificationEmail(profile.email, firstName, title, message, link || undefined);
    }

    count = 1;
  }

  await admin.from('admin_notification_log').insert({
    title,
    message,
    type,
    link: link || null,
    to_all: to === 'all',
    recipient_count: count,
    sent_email: !!sendEmail,
    sent_by: user.id,
  });

  return NextResponse.json({ success: true, count });
}
