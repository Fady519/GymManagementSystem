import type { Metadata } from "next";
import { CategoriesAdmin } from "@/features/categories/components/categories-admin";

export const metadata: Metadata = { title: "Categories" };

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function CategoriesPage() {
  return <CategoriesAdmin />;
}
