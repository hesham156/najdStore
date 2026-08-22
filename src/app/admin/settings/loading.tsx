import { Skeleton } from "@/components/ui/States";
import { PageHeaderSkeleton } from "@/components/ui/TableSkeleton";

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <PageHeaderSkeleton withAction />
      <Skeleton className="h-10 w-full max-w-md rounded-control" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-56 rounded-card" />
      ))}
    </div>
  );
}
