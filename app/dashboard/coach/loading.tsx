import { CardSkeleton } from '@/components/dashboard/Skeleton';

export default function CoachLoading() {
  return (
    <div className="p-8 md:p-10 max-w-4xl">
      <div className="mb-8 animate-pulse">
        <div className="h-3 bg-bg-elevated rounded w-20 mb-3"></div>
        <div className="h-8 bg-bg-elevated rounded w-64 mb-2"></div>
        <div className="h-4 bg-bg-elevated rounded w-96"></div>
      </div>

      <div className="card rounded-xl p-6 mb-5 animate-pulse">
        <div className="h-4 bg-bg-elevated rounded w-1/4 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-bg-elevated rounded w-full"></div>
          <div className="h-4 bg-bg-elevated rounded w-5/6"></div>
          <div className="h-4 bg-bg-elevated rounded w-4/6"></div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-5">
        {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>

      <div className="card rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-bg-elevated rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-bg-elevated rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
