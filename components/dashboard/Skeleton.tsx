export function CardSkeleton() {
  return (
    <div className="card rounded-xl p-5 animate-pulse">
      <div className="h-3 bg-bg-elevated rounded w-1/3 mb-3"></div>
      <div className="h-8 bg-bg-elevated rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-bg-elevated rounded w-2/3"></div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card rounded-xl p-6 animate-pulse">
      <div className="h-4 bg-bg-elevated rounded w-1/4 mb-4"></div>
      <div className="h-[300px] bg-bg-elevated rounded"></div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card rounded-xl animate-pulse overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <div className="h-4 bg-bg-elevated rounded w-1/3"></div>
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 bg-bg-elevated rounded"></div>
        ))}
      </div>
    </div>
  );
}
