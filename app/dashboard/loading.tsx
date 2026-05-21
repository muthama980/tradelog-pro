import { CardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/dashboard/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="p-8 md:p-10 max-w-7xl">
      <div className="flex flex-wrap justify-between items-start gap-6 mb-8 animate-pulse">
        <div>
          <div className="h-3 bg-bg-elevated rounded w-32 mb-3"></div>
          <div className="h-8 bg-bg-elevated rounded w-64"></div>
        </div>
        <div className="h-10 bg-bg-elevated rounded w-28"></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-8">
        <div className="lg:col-span-2">
          <ChartSkeleton />
        </div>
        <CardSkeleton />
      </div>

      <TableSkeleton rows={6} />
    </div>
  );
}
