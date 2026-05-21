import { TableSkeleton, CardSkeleton } from '@/components/dashboard/Skeleton';

export default function JournalLoading() {
  return (
    <div className="p-8 md:p-10 max-w-7xl">
      <div className="flex items-start justify-between mb-8 gap-4 animate-pulse">
        <div>
          <div className="h-3 bg-bg-elevated rounded w-16 mb-3"></div>
          <div className="h-8 bg-bg-elevated rounded w-64"></div>
        </div>
        <div className="h-10 bg-bg-elevated rounded w-28 shrink-0"></div>
      </div>

      <div className="flex gap-3 mb-6 animate-pulse">
        <div className="h-10 bg-bg-elevated rounded flex-1"></div>
        <div className="h-10 bg-bg-elevated rounded w-32"></div>
        <div className="h-10 bg-bg-elevated rounded w-32"></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>

      <TableSkeleton rows={8} />
    </div>
  );
}
