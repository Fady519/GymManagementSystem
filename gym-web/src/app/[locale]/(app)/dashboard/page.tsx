import { Suspense } from "react";
import type { Metadata } from "next";
import { TablePageSkeleton } from "@/components/data-table/table-page-skeleton";
import { AdminOverview } from "@/features/dashboard/components/admin-overview";

export const metadata: Metadata = { title: "Dashboard" };

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function DashboardPage() {
  // Suspense is required because the chart period is read from the URL (useSearchParams).
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <AdminOverview />
    </Suspense>
  );
}
