import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CheckInDesk } from "@/features/check-ins/components/check-in-desk";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CheckIns.desk");
  return { title: t("title") };
}

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function CheckInPage() {
  return <CheckInDesk />;
}
