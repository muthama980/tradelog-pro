import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  sendAffiliateApplicationNotification,
  sendAffiliateConfirmation,
} from '@/lib/email';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, platform, channel_url, audience_size, niche, country, message } = body;

  if (!name?.trim() || !email?.trim() || !platform || !channel_url?.trim() || !audience_size || !niche) {
    return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Prevent duplicate pending/approved applications from same email
  const { data: existing } = await admin
    .from('affiliate_applications')
    .select('id, status')
    .eq('email', email.toLowerCase().trim())
    .in('status', ['pending', 'approved'])
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You've already applied. We'll be in touch soon!" },
      { status: 409 },
    );
  }

  const { error: insertError } = await admin.from('affiliate_applications').insert({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    platform,
    channel_url: channel_url.trim(),
    audience_size,
    niche,
    country: country?.trim() || null,
    message: message?.trim() || null,
  });

  if (insertError) {
    console.error('affiliate_applications insert error:', insertError);
    return NextResponse.json({ error: 'Failed to submit application. Please try again.' }, { status: 500 });
  }

  // Notify all admins
  const { data: admins } = await admin
    .from('profiles')
    .select('id, email')
    .eq('is_admin', true);

  const appData = { name: name.trim(), email, platform, channel_url, audience_size, niche, country: country || null, message: message || null };

  for (const adminUser of admins || []) {
    if (adminUser.email) {
      await sendAffiliateApplicationNotification(adminUser.email, appData);
    }
    await admin.rpc('insert_notification', {
      p_user_id: adminUser.id,
      p_title: `New Affiliate Application — ${name.trim()}`,
      p_message: `${name.trim()} (${platform}) applied to the affiliate program.`,
      p_type: 'info',
      p_link: '/dashboard/admin/affiliates',
    });
  }

  // Confirm to applicant
  await sendAffiliateConfirmation(email.toLowerCase().trim(), name.trim());

  return NextResponse.json({ success: true });
}
