export default function ProductsLoading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container-custom">
        <div className="flex gap-8">
          {/* Sidebar skeleton */}
          <div className="hidden lg:block w-64 shrink-0 space-y-4">
            <div className="h-10 bg-surface-sunken rounded-xl animate-pulse" />
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-9 bg-surface-sunken rounded-lg animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
              ))}
            </div>
          </div>

          {/* Grid skeleton */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div className="h-5 w-32 bg-surface-sunken rounded animate-pulse" />
              <div className="h-9 w-36 bg-surface-sunken rounded-xl animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-line overflow-hidden animate-pulse">
                  <div className="h-44 bg-surface-sunken" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-surface-sunken rounded w-1/3" />
                    <div className="h-5 bg-surface-sunken rounded" />
                    <div className="h-4 bg-surface-sunken rounded w-2/3" />
                    <div className="h-9 bg-surface-sunken rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
