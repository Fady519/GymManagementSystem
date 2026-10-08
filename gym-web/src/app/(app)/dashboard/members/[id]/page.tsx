import { Suspense } from "react";
import type { Metadata } from "next";
import { TablePageSkeleton } from "@/components/data-table/table-page-skeleton";
import { MemberDetails } from "@/features/members/components/member-details";

export const metadata: Metadata = { title: "Member profile" };

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function MemberPage() {
  // The client component reads the id with useParams and the tab with useSearchParams,
  // so it needs a Suspense boundary.
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <MemberDetails />
    </Suspense>
  );
}
