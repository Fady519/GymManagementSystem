import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClassHistory } from "@/features/trainer-portal/components/class-history";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TrainerPortal");
  return { title: t("history.title") };
}

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function TrainerHistoryPage() {
  return <ClassHistory />;
}
