import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPlan, deletePlan, getPlans, setPlanStatus, updatePlan } from "@/features/plans/api";
import type { CreatePlanRequest } from "@/types";

/**
 * Query keys in one place. Every mutation below invalidates planKeys.all,
 * which refreshes every plans query on the screen (admin table and public pricing).
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

/** Create (id = null) or update a plan. */
export function useSavePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number | null; body: CreatePlanRequest }) =>
      id === null ? createPlan(body) : updatePlan(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: planKeys.all }),
  });
}

export function useSetPlanStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      setPlanStatus(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: planKeys.all }),
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePlan(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: planKeys.all }),
  });
}
