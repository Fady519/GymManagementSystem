import { apiClient } from "@/lib/api-client";
import type { CheckInResponsePagedResult, CheckInResult, CheckInResultResponse } from "@/types";

/** The filters of the check-ins log. The list, the totals and the export use the same ones. */
export type CheckInFilters = {
  /** Gym-local day "YYYY-MM-DD", inclusive. */
  from: string | null;
  /** Gym-local day "YYYY-MM-DD", inclusive. */
  to: string | null;
  result: CheckInResult | null;
  memberId: number | null;
};

export type CheckInListParams = CheckInFilters & { page: number; pageSize: number };

/** The filters with the API's parameter names (empty ones left out). Also used by the export. */
export const checkInParams = (filters: CheckInFilters) => ({
  from: filters.from ?? undefined,
  to: filters.to ?? undefined,
  result: filters.result ?? undefined,
  memberId: filters.memberId ?? undefined,
});

/**
 * POST /api/check-ins: the text inside the member's QR. A known code always returns 200:
 * check `result` (Allowed / Denied). An unknown code is a 404 (CheckIn.UnknownCode).
 */
export async function checkIn(code: string): Promise<CheckInResultResponse> {
  const response = await apiClient.post<CheckInResultResponse>("/api/check-ins", { code });
  return response.data;
}

/** GET /api/check-ins: the log, newest first. */
export async function getCheckIns(params: CheckInListParams): Promise<CheckInResponsePagedResult> {
  const response = await apiClient.get<CheckInResponsePagedResult>("/api/check-ins", {
    params: { ...checkInParams(params), page: params.page, pageSize: params.pageSize },
  });
  return response.data;
}
