import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/TableSkeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton withAction />
      <TableSkeleton rows={6} cols={4} withStats />
    </div>
  );
}
