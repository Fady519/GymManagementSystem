import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TrainerOverview } from "@/features/trainer-portal/components/trainer-overview";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TrainerPortal");
  return { title: t("title") };
}

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function TrainerHomePage() {
  return <TrainerOverview />;
}
