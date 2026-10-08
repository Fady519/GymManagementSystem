import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GymSettingsAdmin } from "@/features/settings/components/gym-settings-admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("GymSettings");
  return { title: t("title") };
}

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function GymSettingsPage() {
  return <GymSettingsAdmin />;
}
