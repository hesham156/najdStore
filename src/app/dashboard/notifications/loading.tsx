import { TableSkeleton } from "@/components/ui/TableSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse space-y-2">
        <div className="h-7 w-40 bg-surface-sunken rounded-lg" />
        <div className="h-4 w-24 bg-surface-sunken rounded" />
      </div>
      <TableSkeleton rows={6} cols={4} />
    </div>
  );
}
