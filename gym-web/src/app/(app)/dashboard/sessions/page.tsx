import { Suspense } from "react";
import type { Metadata } from "next";
import { TablePageSkeleton } from "@/components/data-table/table-page-skeleton";
import { SessionsAdmin } from "@/features/sessions/components/sessions-admin";

export const metadata: Metadata = { title: "Classes" };

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function SessionsPage() {
  // Suspense is required because the page reads the URL's search params (useSearchParams).
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <SessionsAdmin />
    </Suspense>
  );
}
