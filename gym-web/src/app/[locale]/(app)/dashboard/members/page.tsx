import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TablePageSkeleton } from "@/components/data-table/table-page-skeleton";
import { MembersAdmin } from "@/features/members/components/members-admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Members.list");
  return { title: t("title") };
}

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
