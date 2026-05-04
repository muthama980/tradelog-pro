import { createClient } from '@/lib/supabase/server';
import AnalyticsCharts from '@/components/dashboard/AnalyticsCharts';

export default async function AnalyticsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user!.id)
    .eq('status', 'closed')
    .order('opened_at', { ascending: true });

  return (
    <div className="p-8 md:p-10 max-w-7xl">
      <div className="mb-8">
        <p className="mono-label mb-2">Analytics</p>
        <h1 className="text-3xl font-bold text-text tracking-tight">The math behind your edge.</h1>
      </div>
      <AnalyticsCharts trades={trades || []} />
    </div>
  );
}
