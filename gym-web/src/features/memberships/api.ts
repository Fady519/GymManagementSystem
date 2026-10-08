import { apiClient } from "@/lib/api-client";
import type {
  CancelMembershipRequest,
  CreateMembershipRequest,
  FreezeMembershipRequest,
  MembershipDetailsResponse,
  MembershipResponse,
  MembershipResponsePagedResult,
  MembershipState,
  RenewMembershipRequest,
} from "@/types";

export type MembershipListParams = {
  state: MembershipState | null;
  /** Member name or phone. */
  search: string;
  page: number;
  pageSize: number;
};

/** GET /api/memberships (admin): newest first, filtered by state and member. */
export async function getMemberships(
  params: MembershipListParams,
): Promise<MembershipResponsePagedResult> {
  const response = await apiClient.get<MembershipResponsePagedResult>("/api/memberships", {
    params: {
      state: params.state ?? undefined,
      search: params.search || undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
  });
  return response.data;
}

/**
 * GET /api/memberships/expiring-soon (admin): running memberships that end within the next
 * days (the API's default window) and have no renewal waiting. Soonest first.
 */
export async function getExpiringSoon(): Promise<MembershipResponse[]> {
  const response = await apiClient.get<MembershipResponse[]>("/api/memberships/expiring-soon");
  return response.data;
}

/** GET /api/memberships/{id}: the membership with its payments and freezes. */
export async function getMembership(id: number): Promise<MembershipDetailsResponse> {
  const response = await apiClient.get<MembershipDetailsResponse>(`/api/memberships/${id}`);
  return response.data;
}

/** POST /api/memberships: sell a plan to a member (starts now, payment recorded). */
export async function createMembership(body: CreateMembershipRequest): Promise<MembershipResponse> {
  const response = await apiClient.post<MembershipResponse>("/api/memberships", body);
  return response.data;
}

/** POST /api/memberships/{id}/renew: queued after the current one, or starts now if it ended. */
export async function renewMembership(
  id: number,
  body: RenewMembershipRequest,
): Promise<MembershipResponse> {
  const response = await apiClient.post<MembershipResponse>(`/api/memberships/${id}/renew`, body);
  return response.data;
}

/** POST /api/memberships/{id}/cancel: optional refund (needs a method). */
export async function cancelMembership(
  id: number,
  body: CancelMembershipRequest,
): Promise<MembershipResponse> {
  const response = await apiClient.post<MembershipResponse>(`/api/memberships/${id}/cancel`, body);
  return response.data;
}

/** POST /api/memberships/{id}/freeze: pauses it; the end date moves later by the same days. */
export async function freezeMembership(
  id: number,
  body: FreezeMembershipRequest,
): Promise<MembershipResponse> {
  const response = await apiClient.post<MembershipResponse>(`/api/memberships/${id}/freeze`, body);
  return response.data;
}

/** POST /api/memberships/{id}/unfreeze: ends the freeze early and gives the unused days back. */
export async function unfreezeMembership(id: number): Promise<MembershipResponse> {
  const response = await apiClient.post<MembershipResponse>(`/api/memberships/${id}/unfreeze`);
  return response.data;
}
