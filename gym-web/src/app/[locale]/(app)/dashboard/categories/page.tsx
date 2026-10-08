import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CategoriesAdmin } from "@/features/categories/components/categories-admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Categories");
  return { title: t("title") };
}

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function CategoriesPage() {
  return <CategoriesAdmin />;
}
