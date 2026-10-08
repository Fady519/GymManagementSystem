import { apiClient } from "@/lib/api-client";
import type { HealthRecordDto, MemberResponse, UpdateMyProfileRequest } from "@/types";

/** PUT /api/me: a member can change only their phone and address (the rest is done at reception). */
export async function updateMyProfile(body: UpdateMyProfileRequest): Promise<MemberResponse> {
  const response = await apiClient.put<MemberResponse>("/api/me", body);
  return response.data;
}

/** PUT /api/me/health-record: adds or replaces the health record. */
export async function saveMyHealthRecord(body: HealthRecordDto): Promise<HealthRecordDto> {
  const response = await apiClient.put<HealthRecordDto>("/api/me/health-record", body);
  return response.data;
}

/**
 * PUT /api/me/photo as multipart/form-data (field "photo"; JPG, PNG or WEBP, max 2 MB).
 * We don't set Content-Type: the browser adds it with the multipart boundary.
 */
export async function uploadMyPhoto(file: File): Promise<MemberResponse> {
  const form = new FormData();
  form.append("photo", file);
  const response = await apiClient.put<MemberResponse>("/api/me/photo", form);
  return response.data;
}

/** DELETE /api/me/photo (204). */
export async function deleteMyPhoto(): Promise<void> {
  await apiClient.delete("/api/me/photo");
}
