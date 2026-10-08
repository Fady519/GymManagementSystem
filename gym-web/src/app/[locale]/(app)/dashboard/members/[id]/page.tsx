import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TablePageSkeleton } from "@/components/data-table/table-page-skeleton";
import { MemberDetails } from "@/features/members/components/member-details";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Members.details");
  return { title: t("metaTitle") };
}

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
