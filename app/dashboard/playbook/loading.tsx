import { CardSkeleton } from '@/components/dashboard/Skeleton';

export default function PlaybookLoading() {
  return (
    <div className="p-8 md:p-10 max-w-7xl">
      <div className="flex items-start justify-between mb-8 gap-4 animate-pulse">
        <div>
          <div className="h-3 bg-bg-elevated rounded w-20 mb-3"></div>
          <div className="h-8 bg-bg-elevated rounded w-80 mb-2"></div>
          <div className="h-8 bg-bg-elevated rounded w-64"></div>
        </div>
        <div className="h-10 bg-bg-elevated rounded w-32 shrink-0"></div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
