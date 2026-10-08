import type { PaymentResponse } from "@/types";

export type PaymentSummary = {
  /** Money paid in (purchases + renewals) minus money given back (refunds). */
  netPaid: number;
  refunded: number;
  count: number;
  latest: PaymentResponse | null;
  oldest: PaymentResponse | null;
};

/** Newest first. The API already sorts this way, but we don't want the page to depend on it. */
export function sortNewestFirst(payments: PaymentResponse[]): PaymentResponse[] {
  return [...payments].sort((a, b) => Date.parse(b.paidAt) - Date.parse(a.paidAt));
}

/** The API stores every amount as a positive number; a refund is money going back to the member. */
export function signedAmount(payment: PaymentResponse): number {
  return payment.type === "Refund" ? -Math.abs(payment.amount) : payment.amount;
}

/** The numbers for the summary tiles, computed from the list (it's small: one member's payments). */
export function summarizePayments(sorted: PaymentResponse[]): PaymentSummary {
  const refunded = sorted
    .filter((p) => p.type === "Refund")
    .reduce((sum, p) => sum + Math.abs(p.amount), 0);
  const netPaid = sorted.reduce((sum, p) => sum + signedAmount(p), 0);

  return {
    netPaid,
    refunded,
    count: sorted.length,
    latest: sorted[0] ?? null,
    oldest: sorted.at(-1) ?? null,
  };
}
