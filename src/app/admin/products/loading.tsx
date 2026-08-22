import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/TableSkeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton withAction />
      <TableSkeleton rows={8} cols={6} withStats />
    </div>
  );
}
