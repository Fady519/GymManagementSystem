import { apiClient } from "@/lib/api-client";
import type {
  CreateAdminRequest,
  CreatedUserResponse,
  InviteResponse,
  UserResponse,
  UserResponsePagedResult,
} from "@/types";

/** The four roles the API knows. The role filter sends one of these exactly as written. */
export const USER_ROLES = ["SuperAdmin", "Admin", "Trainer", "Member"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type UserListParams = {
  search: string;
  role: UserRole | null;
  page: number;
  pageSize: number;
};

/** GET /api/users (Super admin only): every login account, sorted by email, searched and paged by the API. */
export async function getUsers(params: UserListParams): Promise<UserResponsePagedResult> {
  const response = await apiClient.get<UserResponsePagedResult>("/api/users", {
    params: {
      search: params.search || undefined,
      role: params.role ?? undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
  });
  return response.data;
}

/**
 * POST /api/users/admins (Super admin only). Creates an Admin login with no password and emails
 * them an invite link to choose one. inviteSent = false means the email failed (resend it later).
 */
export async function createAdmin(body: CreateAdminRequest): Promise<CreatedUserResponse> {
  const response = await apiClient.post<CreatedUserResponse>("/api/users/admins", body);
  return response.data;
}

/** POST /api/users/{id}/resend-invite. 409 once the person has chosen a password. */
export async function resendUserInvite(id: number): Promise<InviteResponse> {
  const response = await apiClient.post<InviteResponse>(`/api/users/${id}/resend-invite`);
  return response.data;
}

/**
 * PATCH /api/users/{id}/status. Disabling also signs the person out of every device.
 * A Super admin can't be disabled (403), so nobody can lock everyone out of the system.
 */
export async function setUserStatus(id: number, isActive: boolean): Promise<UserResponse> {
  const response = await apiClient.patch<UserResponse>(`/api/users/${id}/status`, { isActive });
  return response.data;
}
