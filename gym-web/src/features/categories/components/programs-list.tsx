"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/shared/query-error";
import { useCategories } from "@/features/categories/queries";

/** Training programs (GET /api/categories) with how many coaches teach each one. */
export function ProgramsList() {
  const { data: categories, isPending, isError, error, refetch, isFetching } = useCategories();

  if (isPending) {
    return (
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-40 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <QueryError
        title="We couldn't load our programs"
        error={error}
        onRetry={refetch}
        retrying={isFetching}
      />
    );
  }

  if (categories.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-3">
      {categories.map((category) => (
        <li
          key={category.id}
          className="rounded-xl border bg-card px-5 py-3 transition-colors hover:border-primary/50"
        >
          <span className="block font-semibold">{category.name}</span>
          <span className="text-sm text-muted-foreground">
            {category.trainersCount === 0
              ? "Coach joining soon"
              : category.trainersCount === 1
                ? "1 coach"
                : `${category.trainersCount} coaches`}
          </span>
        </li>
      ))}
    </ul>
  );
}
