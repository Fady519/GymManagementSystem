import type { components } from "@/types/api";

/**
 * Friendly names for the types generated from docs/openapi.json (run `npm run gen:api` after the API changes).
 * Add a line here when a page needs a new type.
 */
type Schemas = components["schemas"];

export type PlanResponse = Schemas["PlanResponse"];
export type CategoryResponse = Schemas["CategoryResponse"];
export type SessionResponse = Schemas["SessionResponse"];
export type SessionResponsePagedResult = Schemas["SessionResponsePagedResult"];

// Auth
export type AuthResponse = Schemas["AuthResponse"];
export type CurrentUserResponse = Schemas["CurrentUserResponse"];
export type LoginRequest = Schemas["LoginRequest"];
export type RegisterRequest = Schemas["RegisterRequest"];
export type ForgotPasswordRequest = Schemas["ForgotPasswordRequest"];
export type ResetPasswordRequest = Schemas["ResetPasswordRequest"];
export type AcceptInviteRequest = Schemas["AcceptInviteRequest"];
export type ChangePasswordRequest = Schemas["ChangePasswordRequest"];
export type MessageResponse = Schemas["MessageResponse"];
export type Gender = Schemas["Gender"];

// Dashboards
export type AnalyticsSummaryResponse = Schemas["AnalyticsSummaryResponse"];
export type MemberResponse = Schemas["MemberResponse"];
export type MembershipResponse = Schemas["MembershipResponse"];
export type MembershipState = Schemas["MembershipState"];
export type TrainerResponse = Schemas["TrainerResponse"];
