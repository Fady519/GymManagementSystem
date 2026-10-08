import { apiClient } from "@/lib/api-client";
import type {
  PaymentMethod,
  PaymentResponsePagedResult,
  PaymentSummaryResponse,
  PaymentType,
} from "@/types";

/** The filters of the payments page. The list and the totals use the same ones. */
export type PaymentFilters = {
  /** UTC, inclusive. */
  from: string | null;
  /** UTC, exclusive. */
  to: string | null;
  method: PaymentMethod | null;
  type: PaymentType | null;
};

export type PaymentListParams = PaymentFilters & { page: number; pageSize: number };

const toParams = (filters: PaymentFilters) => ({
  from: filters.from ?? undefined,
  to: filters.to ?? undefined,
  method: filters.method ?? undefined,
  type: filters.type ?? undefined,
});

/** GET /api/payments (admin): newest first. */
export async function getPayments(params: PaymentListParams): Promise<PaymentResponsePagedResult> {
  const response = await apiClient.get<PaymentResponsePagedResult>("/api/payments", {
    params: { ...toParams(params), page: params.page, pageSize: params.pageSize },
  });
  return response.data;
}

/** GET /api/payments/summary (admin): count, income, refunds and net for ALL matching payments (not one page). */
export async function getPaymentSummary(filters: PaymentFilters): Promise<PaymentSummaryResponse> {
  const response = await apiClient.get<PaymentSummaryResponse>("/api/payments/summary", {
    params: toParams(filters),
  });
  return response.data;
}
