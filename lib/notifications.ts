import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const WELCOME_NOTIFICATIONS = [
  {
    title: 'Welcome to TradeLog Pro! 🎉',
    message: 'Your 4-day free trial has started. Explore your dashboard and log your first trade.',
    type: 'success',
    link: '/dashboard/journal',
  },
  {
    title: 'Connect your exchange',
    message: 'Import trades automatically from Binance, Coinbase, or upload a CSV file.',
    type: 'info',
    link: '/dashboard/connections',
  },
  {
    title: 'Set up your strategy tags',
    message: 'Create custom strategy tags to track which setups make you the most money.',
    type: 'info',
    link: '/dashboard/journal',
  },
];

export async function createWelcomeNotifications(userId: string) {
  const supabase = adminClient();
  await Promise.all(
    WELCOME_NOTIFICATIONS.map(n =>
      supabase.rpc('insert_notification', {
        p_user_id: userId,
        p_title:   n.title,
        p_message: n.message,
        p_type:    n.type,
        p_link:    n.link,
      })
    )
  );
}
