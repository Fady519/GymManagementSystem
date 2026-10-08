import { apiClient } from "@/lib/api-client";
import type { PaymentResponse } from "@/types";

/** GET /api/me/payments: the logged-in member's purchases, renewals and refunds (newest first). */
export async function getMyPayments(): Promise<PaymentResponse[]> {
  const response = await apiClient.get<PaymentResponse[]>("/api/me/payments");
  return response.data;
}
