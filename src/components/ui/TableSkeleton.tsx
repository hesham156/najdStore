import { Skeleton, SkeletonStats } from "./States";

/** Page-level placeholder that mirrors the list layout: header → stats → table. */
export function TableSkeleton({
  rows = 8,
  cols = 5,
  withStats,
}: {
  rows?: number;
  cols?: number;
  withStats?: boolean;
}) {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">جارٍ التحميل…</span>
      {withStats && <SkeletonStats />}
      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <div className="flex gap-4 border-b border-line bg-surface-muted px-4 py-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 flex-1" />
          ))}
        </div>
        <div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-0">
              {Array.from({ length: cols }).map((_, j) => (
                <Skeleton
                  key={j}
                  className="h-4 flex-1"
                  /* Varying widths read as content rather than a loading grid. */
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Header placeholder: title + subtitle. */
export function PageHeaderSkeleton({ withAction }: { withAction?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3.5 w-28" />
      </div>
      {withAction && <Skeleton className="h-10 w-32 rounded-control" />}
    </div>
  );
}
