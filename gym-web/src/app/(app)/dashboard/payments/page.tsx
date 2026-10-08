import { Suspense } from "react";
import type { Metadata } from "next";
import { TablePageSkeleton } from "@/components/data-table/table-page-skeleton";
import { PaymentsAdmin } from "@/features/payments/components/payments-admin";

export const metadata: Metadata = { title: "Payments" };

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function PaymentsPage() {
  // Suspense is required because the page reads the URL's search params (useSearchParams).
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <PaymentsAdmin />
    </Suspense>
  );
}
