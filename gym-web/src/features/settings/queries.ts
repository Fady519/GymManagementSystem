import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "react-redux";
import { refreshPublicSite } from "@/features/settings/actions";
import { getGymSettings, updateGymSettings } from "@/features/settings/api";
import type { RootState } from "@/store/store";
import type { UpdateGymSettingsRequest } from "@/types";

export const settingsKeys = {
  gym: ["settings", "gym"] as const,
};

export function useGymSettings() {
  return useQuery({ queryKey: settingsKeys.gym, queryFn: getGymSettings });
}

/**
 * Saves the gym settings, then asks the Next.js server to refresh the cached website.
 * The result says whether the website already shows the change (live) or will within a minute.
 */
export function useUpdateGymSettings() {
  const queryClient = useQueryClient();
  const store = useStore<RootState>();

  return useMutation({
    mutationFn: async (body: UpdateGymSettingsRequest) => {
      const saved = await updateGymSettings(body);
      // Read the token at this moment (it may have been refreshed while the form was open).
      const token = store.getState().auth.accessToken;
      const live = token ? await refreshPublicSite(token) : false;
      return { saved, live };
    },
    onSuccess: ({ saved }) => queryClient.setQueryData(settingsKeys.gym, saved),
  });
}
