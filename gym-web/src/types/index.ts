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
export type MembershipResponse = Schemas["MembershipResponse"];
export type MembershipResponsePagedResult = Schemas["MembershipResponsePagedResult"];
export type MembershipState = Schemas["MembershipState"];

/**
 * The generator drops "| null" on properties that point to another schema (address, healthRecord),
 * even though the API sends null when they are empty. This puts it back so TypeScript makes us check.
 */
type WithNullable<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] | null };

// Shared parts
export type AddressDto = Schemas["AddressDto"];
export type HealthRecordDto = Schemas["HealthRecordDto"];

// Members
export type MemberResponse = WithNullable<Schemas["MemberResponse"], "address" | "healthRecord">;
export type MemberListItem = Schemas["MemberListItem"];
export type MemberListItemPagedResult = Schemas["MemberListItemPagedResult"];
export type MemberMembershipState = Schemas["MemberMembershipState"];
export type MemberSortBy = Schemas["MemberSortBy"];
export type CreateMemberRequest = WithNullable<
  Schemas["CreateMemberRequest"],
  "address" | "healthRecord"
>;
export type UpdateMemberRequest = WithNullable<Schemas["UpdateMemberRequest"], "address">;
export type MemberWithAccountResponse = { member: MemberResponse; inviteSent: boolean };

// Trainers
export type TrainerResponse = WithNullable<Schemas["TrainerResponse"], "address">;
export type TrainerResponsePagedResult = Omit<Schemas["TrainerResponsePagedResult"], "items"> & {
  items: TrainerResponse[];
};
export type SaveTrainerRequest = WithNullable<Schemas["SaveTrainerRequest"], "address">;
export type TrainerWithAccountResponse = { trainer: TrainerResponse; inviteSent: boolean };

// Plans and categories
export type CreatePlanRequest = Schemas["CreatePlanRequest"];
export type UpdatePlanRequest = Schemas["UpdatePlanRequest"];
export type SaveCategoryRequest = Schemas["SaveCategoryRequest"];

// Payments
export type PaymentResponse = Schemas["PaymentResponse"];
export type PaymentResponsePagedResult = Schemas["PaymentResponsePagedResult"];
export type PaymentSummaryResponse = Schemas["PaymentSummaryResponse"];
export type PaymentMethod = Schemas["PaymentMethod"];
export type PaymentType = Schemas["PaymentType"];

// Sessions and bookings
export type SessionState = Schemas["SessionState"];
export type SaveSessionRequest = Schemas["SaveSessionRequest"];
export type SessionBookingItem = Schemas["SessionBookingItem"];
export type AvailableMemberItem = Schemas["AvailableMemberItem"];
export type BookingResponse = Schemas["BookingResponse"];
export type BookingStatus = Schemas["BookingStatus"];
export type MyBookingItem = Schemas["MyBookingItem"];
export type MyBookingItemPagedResult = Schemas["MyBookingItemPagedResult"];

// Memberships
export type MembershipDetailsResponse = Schemas["MembershipDetailsResponse"];
export type MembershipFreezeResponse = Schemas["MembershipFreezeResponse"];
export type CreateMembershipRequest = Schemas["CreateMembershipRequest"];
export type RenewMembershipRequest = Schemas["RenewMembershipRequest"];
export type CancelMembershipRequest = WithNullable<
  Schemas["CancelMembershipRequest"],
  "refundMethod"
>;
export type FreezeMembershipRequest = Schemas["FreezeMembershipRequest"];

// Analytics (dashboard charts)
export type RevenuePeriod = Schemas["RevenuePeriod"];
export type RevenuePoint = Schemas["RevenuePoint"];
export type RevenueResponse = Schemas["RevenueResponse"];
export type MembersGrowthPoint = Schemas["MembersGrowthPoint"];
export type AttendanceRateResponse = Schemas["AttendanceRateResponse"];
export type PlanDistributionItem = Schemas["PlanDistributionItem"];
export type TopCategoryItem = Schemas["TopCategoryItem"];

// Check-ins (denyReason is null when the member was let in)
export type CheckInResult = Schemas["CheckInResult"];
export type CheckInDenyReason = Schemas["CheckInDenyReason"];
export type CheckInRequest = Schemas["CheckInRequest"];
export type CheckInResultResponse = WithNullable<Schemas["CheckInResultResponse"], "denyReason">;
export type CheckInResponse = WithNullable<Schemas["CheckInResponse"], "denyReason">;
export type CheckInResponsePagedResult = Omit<Schemas["CheckInResponsePagedResult"], "items"> & {
  items: CheckInResponse[];
};

// Exports
export type ExportFormat = Schemas["ExportFormat"];

// Gym settings and the public website (no login needed)
export type GymSettingsResponse = Schemas["GymSettingsResponse"];
export type UpdateGymSettingsRequest = Schemas["UpdateGymSettingsRequest"];
export type PublicStatsResponse = Schemas["PublicStatsResponse"];
export type PublicTrainerResponse = Schemas["PublicTrainerResponse"];

// Member portal
export type CheckInCodeResponse = Schemas["CheckInCodeResponse"];
export type UpdateMyProfileRequest = WithNullable<Schemas["UpdateMyProfileRequest"], "address">;
