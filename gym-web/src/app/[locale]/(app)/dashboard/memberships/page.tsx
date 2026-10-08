import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TablePageSkeleton } from "@/components/data-table/table-page-skeleton";
import { MembershipsAdmin } from "@/features/memberships/components/memberships-admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Memberships.list");
  return { title: t("title") };
}

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
