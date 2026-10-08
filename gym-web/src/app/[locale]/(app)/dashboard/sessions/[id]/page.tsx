import { Suspense } from "react";
import type { Metadata } from "next";
import { TablePageSkeleton } from "@/components/data-table/table-page-skeleton";
import { SessionDetails } from "@/features/sessions/components/session-details";

export const metadata: Metadata = { title: "Class" };

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function SessionPage() {
  // The client component reads the id with useParams, so it needs a Suspense boundary.
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <SessionDetails />
    </Suspense>
  );
}
