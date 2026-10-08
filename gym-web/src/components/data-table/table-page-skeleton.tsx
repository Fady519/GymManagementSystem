import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder for a list page while it loads: title, toolbar and a few table rows. */
export function TablePageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-9 w-full max-w-sm" />
      <div className="space-y-3 rounded-xl border p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    </div>
  );
}
