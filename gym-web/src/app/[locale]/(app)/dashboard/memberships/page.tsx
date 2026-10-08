import { Suspense } from "react";
import type { Metadata } from "next";
import { TablePageSkeleton } from "@/components/data-table/table-page-skeleton";
import { MembershipsAdmin } from "@/features/memberships/components/memberships-admin";

export const metadata: Metadata = { title: "Memberships" };

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function MembershipsPage() {
  // Suspense is required because the page reads the URL's search params (useSearchParams).
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <MembershipsAdmin />
    </Suspense>
  );
}
