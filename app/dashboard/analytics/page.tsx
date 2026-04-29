import { createClient } from '@/lib/supabase/server';
import AnalyticsCharts from '@/components/dashboard/AnalyticsCharts';
import DownloadReportButton from '@/components/dashboard/DownloadReportButton';

export default async function AnalyticsPage() {
  const supabase = createClient();
  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('status', 'closed')
    .order('opened_at', { ascending: true });

  return (
    <div className="p-8 md:p-10 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="mono-label mb-2">Analytics</p>
          <h1 className="text-3xl font-bold text-text tracking-tight">The math behind your edge.</h1>
        </div>
        <DownloadReportButton trades={trades || []} />
      </div>
      <AnalyticsCharts trades={trades || []} />
    </div>
  );
}
