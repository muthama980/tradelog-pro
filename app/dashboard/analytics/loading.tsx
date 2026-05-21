import { CardSkeleton, ChartSkeleton } from '@/components/dashboard/Skeleton';

export default function AnalyticsLoading() {
  return (
    <div className="p-8 md:p-10 max-w-7xl">
      <div className="mb-8 animate-pulse">
        <div className="h-3 bg-bg-elevated rounded w-20 mb-3"></div>
        <div className="h-8 bg-bg-elevated rounded w-72"></div>
      </div>

      <div className="flex gap-3 mb-5 animate-pulse">
        <div className="h-10 bg-bg-elevated rounded flex-1"></div>
        <div className="h-10 bg-bg-elevated rounded w-24"></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>

      <div className="space-y-5">
        <ChartSkeleton />
        <div className="grid lg:grid-cols-2 gap-5">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
      </div>
    </div>
  );
}
