import { Skeleton } from "@/components/ui/States";
import { PageHeaderSkeleton } from "@/components/ui/TableSkeleton";

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-card" />
          ))}
        </div>
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
