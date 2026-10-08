import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder with the shape of an auth form, shown for a moment while the page reads the URL. */
export function FormSkeleton({ fields }: { fields: number }) {
  return (
    <div aria-hidden className="space-y-5">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-full" />
      </div>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
