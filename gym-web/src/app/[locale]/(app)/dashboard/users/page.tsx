import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TablePageSkeleton } from "@/components/data-table/table-page-skeleton";
import { UsersAdmin } from "@/features/users/components/users-admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Users");
  return { title: t("title") };
}

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

/** Login accounts. Only the Super admin sees this link; an Admin who opens it gets a short explanation. */
export default function UsersPage() {
  // Suspense is required because the page reads the URL's search params (useSearchParams).
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <UsersAdmin />
    </Suspense>
  );
}
