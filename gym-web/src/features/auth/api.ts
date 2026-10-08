import { apiClient } from "@/lib/api-client";
import type {
  AcceptInviteRequest,
  AuthResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  ResetPasswordRequest,
} from "@/types";

// The refresh call lives in lib/api-client.ts (refreshSession), because the 401 interceptor needs it.

/** POST /api/auth/login: returns the access token and sets the refresh cookie. */
export async function login(body: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/api/auth/login", body);
  return response.data;
}

/** POST /api/auth/register: creates the login account AND the member profile, then logs in. */
export async function register(body: RegisterRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/api/auth/register", body);
  return response.data;
}

/** POST /api/auth/logout: revokes the refresh token and deletes the cookie. */
export async function logout(): Promise<void> {
  await apiClient.post("/api/auth/logout");
}

/** POST /api/auth/change-password: signs out other devices and returns a fresh session. */
export async function changePassword(body: ChangePasswordRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/api/auth/change-password", body);
  return response.data;
}

/** POST /api/auth/forgot-password: always the same answer, so nobody can test which emails exist. */
export async function forgotPassword(body: ForgotPasswordRequest): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>("/api/auth/forgot-password", body);
  return response.data;
}

/** POST /api/auth/reset-password: uses the token from the email link. */
export async function resetPassword(body: ResetPasswordRequest): Promise<void> {
  await apiClient.post("/api/auth/reset-password", body);
}

/** POST /api/auth/accept-invite: first password for accounts the gym created (staff, members). */
export async function acceptInvite(body: AcceptInviteRequest): Promise<void> {
  await apiClient.post("/api/auth/accept-invite", body);
}
