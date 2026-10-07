import { useQuery } from "@tanstack/react-query";
import { getPlans } from "@/features/plans/api";

/**
 * Query keys in one place. Mutations (create/update/delete in F2) invalidate planKeys.all,
 * which refreshes every plans query on the screen.
 */
export const planKeys = {
  all: ["plans"] as const,
  list: (isActive?: boolean) => [...planKeys.all, "list", { isActive }] as const,
};

/** The plans list, cached and shared by every component that asks for the same filter. */
export function usePlans(isActive?: boolean) {
  return useQuery({
    queryKey: planKeys.list(isActive),
    queryFn: () => getPlans(isActive),
  });
}
