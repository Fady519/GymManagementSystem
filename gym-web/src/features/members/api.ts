import { apiClient } from "@/lib/api-client";
import type {
  CreateMemberRequest,
  Gender,
  HealthRecordDto,
  MemberListItemPagedResult,
  MemberMembershipState,
  MemberResponse,
  MemberSortBy,
  MemberWithAccountResponse,
  MembershipResponsePagedResult,
  MyBookingItemPagedResult,
  PaymentResponse,
  UpdateMemberRequest,
} from "@/types";

export type MemberListParams = {
  search: string;
  gender: Gender | null;
  state: MemberMembershipState | null;
  sortBy: MemberSortBy;
  descending: boolean;
  page: number;
  pageSize: number;
};

/** GET /api/members (admin): searched, filtered, sorted and paged in SQL by the API. */
export async function getMembers(params: MemberListParams): Promise<MemberListItemPagedResult> {
  const response = await apiClient.get<MemberListItemPagedResult>("/api/members", {
    params: {
      search: params.search || undefined,
      gender: params.gender ?? undefined,
      membershipState: params.state ?? undefined,
      sortBy: params.sortBy,
      descending: params.descending,
      page: params.page,
      pageSize: params.pageSize,
    },
  });
  return response.data;
}

/** GET /api/members/{id}: full profile with address, health record and membership state. */
export async function getMember(id: number): Promise<MemberResponse> {
  const response = await apiClient.get<MemberResponse>(`/api/members/${id}`);
  return response.data;
}

/** POST /api/members (reception). The photo is uploaded afterwards with uploadMemberPhoto. */
export async function createMember(body: CreateMemberRequest): Promise<MemberResponse> {
  const response = await apiClient.post<MemberResponse>("/api/members", body);
  return response.data;
}

/** PUT /api/members/{id}: personal data and address (health has its own endpoint). */
export async function updateMember(id: number, body: UpdateMemberRequest): Promise<MemberResponse> {
  const response = await apiClient.put<MemberResponse>(`/api/members/${id}`, body);
  return response.data;
}

/** DELETE /api/members/{id}. 409 while they have an active membership or upcoming bookings. */
export async function deleteMember(id: number): Promise<void> {
  await apiClient.delete(`/api/members/${id}`);
}

/** PUT /api/members/{id}/health-record: add or replace. */
export async function saveHealthRecord(
  id: number,
  body: HealthRecordDto,
): Promise<HealthRecordDto> {
  const response = await apiClient.put<HealthRecordDto>(`/api/members/${id}/health-record`, body);
  return response.data;
}

/**
 * PUT /api/members/{id}/photo as multipart/form-data (JPG, PNG or WEBP, max 2 MB).
 * We don't set Content-Type: the browser adds it with the multipart boundary.
 */
export async function uploadMemberPhoto(id: number, file: File): Promise<MemberResponse> {
  const form = new FormData();
  form.append("photo", file);
  const response = await apiClient.put<MemberResponse>(`/api/members/${id}/photo`, form);
  return response.data;
}

/** DELETE /api/members/{id}/photo. */
export async function deleteMemberPhoto(id: number): Promise<void> {
  await apiClient.delete(`/api/members/${id}/photo`);
}

/** GET /api/members/{id}/payments: purchases, renewals and refunds, newest first. */
export async function getMemberPayments(id: number): Promise<PaymentResponse[]> {
  const response = await apiClient.get<PaymentResponse[]>(`/api/members/${id}/payments`);
  return response.data;
}

/** GET /api/memberships?memberId=: the member's membership history (100 is far more than anyone has). */
export async function getMemberMemberships(id: number): Promise<MembershipResponsePagedResult> {
  const response = await apiClient.get<MembershipResponsePagedResult>("/api/memberships", {
    params: { memberId: id, pageSize: 100 },
  });
  return response.data;
}

export type MemberBookingsParams = { upcoming: boolean; page: number; pageSize: number };

/**
 * GET /api/members/{id}/bookings: the member's classes. upcoming = only active bookings of
 * classes that haven't started (soonest first); otherwise everything, newest first.
 */
export async function getMemberBookings(
  id: number,
  params: MemberBookingsParams,
): Promise<MyBookingItemPagedResult> {
  const response = await apiClient.get<MyBookingItemPagedResult>(`/api/members/${id}/bookings`, {
    params,
  });
  return response.data;
}

/** POST /api/members/{id}/account: create the online account and email the invite (or resend it). */
export async function sendMemberInvite(id: number): Promise<MemberWithAccountResponse> {
  const response = await apiClient.post<MemberWithAccountResponse>(`/api/members/${id}/account`);
  return response.data;
}
