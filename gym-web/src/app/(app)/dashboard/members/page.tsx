import { Suspense } from "react";
import type { Metadata } from "next";
import { TablePageSkeleton } from "@/components/data-table/table-page-skeleton";
import { MembersAdmin } from "@/features/members/components/members-admin";

export const metadata: Metadata = { title: "Members" };

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function MembersPage() {
  // Suspense is required because the page reads the URL's search params (useSearchParams).
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <MembersAdmin />
    </Suspense>
  );
}
