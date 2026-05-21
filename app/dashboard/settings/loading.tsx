export default function SettingsLoading() {
  return (
    <div className="p-8 md:p-10 max-w-3xl">
      <div className="mb-10 animate-pulse">
        <div className="h-3 bg-bg-elevated rounded w-16 mb-3"></div>
        <div className="h-8 bg-bg-elevated rounded w-48"></div>
      </div>

      <div className="space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card rounded-xl p-7 animate-pulse">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-4 h-4 bg-bg-elevated rounded"></div>
              <div className="h-5 bg-bg-elevated rounded w-32"></div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-border/50">
                <div className="h-4 bg-bg-elevated rounded w-24"></div>
                <div className="h-4 bg-bg-elevated rounded w-32"></div>
              </div>
              <div className="flex justify-between py-3 border-b border-border/50">
                <div className="h-4 bg-bg-elevated rounded w-16"></div>
                <div className="h-4 bg-bg-elevated rounded w-40"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
