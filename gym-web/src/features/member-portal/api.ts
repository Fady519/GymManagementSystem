import { apiClient } from "@/lib/api-client";
import type { MemberResponse, MembershipResponse } from "@/types";

/** GET /api/me: the logged-in member's profile. */
export async function getMyProfile(): Promise<MemberResponse> {
  const response = await apiClient.get<MemberResponse>("/api/me");
  return response.data;
}

/** GET /api/me/memberships: current and past memberships, newest first. */
export async function getMyMemberships(): Promise<MembershipResponse[]> {
  const response = await apiClient.get<MembershipResponse[]>("/api/me/memberships");
  return response.data;
}
