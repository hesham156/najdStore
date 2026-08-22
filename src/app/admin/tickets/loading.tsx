import { Skeleton } from "@/components/ui/States";

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-var(--header-h)-3rem)] gap-0 overflow-hidden rounded-card border border-line bg-surface" aria-busy="true">
      <div className="hidden w-80 shrink-0 space-y-3 border-e border-line p-4 md:block lg:w-96">
        <Skeleton className="h-9 w-full rounded-control" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 py-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-full w-full rounded-control" />
      </div>
    </div>
  );
}
