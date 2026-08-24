export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Welcome banner */}
      <div className="h-28 bg-gradient-to-l from-primary-600 to-primary-800 rounded-2xl opacity-60" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-2xl p-5 border border-line">
            <div className="h-4 w-20 bg-surface-sunken rounded mb-3" />
            <div className="h-8 w-16 bg-surface-sunken rounded" />
          </div>
        ))}
      </div>

      {/* Orders list */}
      <div className="bg-surface rounded-2xl border border-line overflow-hidden">
        <div className="p-4 border-b border-line">
          <div className="h-5 w-28 bg-surface-sunken rounded" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-line last:border-0">
            <div className="w-10 h-10 bg-surface-sunken rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-surface-sunken rounded" />
              <div className="h-3 w-1/4 bg-surface-sunken rounded" />
            </div>
            <div className="h-6 w-20 bg-surface-sunken rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
