import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoryKeys } from "@/features/categories/queries";
import {
  createTrainer,
  deleteTrainer,
  getTrainers,
  sendTrainerInvite,
  updateTrainer,
  type TrainerListParams,
} from "@/features/trainers/api";
import type { SaveTrainerRequest } from "@/types";

export const trainerKeys = {
  all: ["trainers"] as const,
  /** Every filter is part of the key, so each page/search is cached separately. */
  list: (params: TrainerListParams) => [...trainerKeys.all, "list", params] as const,
};

export function useTrainers(params: TrainerListParams) {
  return useQuery({
    queryKey: trainerKeys.list(params),
    queryFn: () => getTrainers(params),
    // Keep showing the current page while the next one loads, instead of flashing skeletons.
    placeholderData: keepPreviousData,
  });
}

/** After any trainer change: refresh trainer lists and category trainer counts. */
function useRefreshTrainers() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: trainerKeys.all });
    await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
  };
}

export function useCreateTrainer() {
  const refresh = useRefreshTrainers();
  return useMutation({
    mutationFn: (body: SaveTrainerRequest) => createTrainer(body),
    onSuccess: refresh,
  });
}

export function useUpdateTrainer() {
  const refresh = useRefreshTrainers();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: SaveTrainerRequest }) => updateTrainer(id, body),
    onSuccess: refresh,
  });
}

export function useDeleteTrainer() {
  const refresh = useRefreshTrainers();
  return useMutation({
    mutationFn: (id: number) => deleteTrainer(id),
    onSuccess: refresh,
  });
}

export function useSendTrainerInvite() {
  const refresh = useRefreshTrainers();
  return useMutation({
    mutationFn: (id: number) => sendTrainerInvite(id),
    onSuccess: refresh,
  });
}
