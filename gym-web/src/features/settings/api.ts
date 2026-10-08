import { apiClient } from "@/lib/api-client";
import type { GymSettingsResponse, UpdateGymSettingsRequest } from "@/types";

/** GET /api/settings/gym (admin): the contact details and opening hours shown on the website. */
export async function getGymSettings(): Promise<GymSettingsResponse> {
  const response = await apiClient.get<GymSettingsResponse>("/api/settings/gym");
  return response.data;
}

/** PUT /api/settings/gym (admin). Empty optional fields are saved as null. 400 Validation.Failed on bad input. */
export async function updateGymSettings(
  body: UpdateGymSettingsRequest,
): Promise<GymSettingsResponse> {
  const response = await apiClient.put<GymSettingsResponse>("/api/settings/gym", body);
  return response.data;
}
