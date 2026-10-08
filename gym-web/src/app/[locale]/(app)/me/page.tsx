import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MemberOverview } from "@/features/member-portal/components/member-overview";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MemberPortal.overview");
  return { title: t("title") };
}

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function MemberHomePage() {
  return <MemberOverview />;
}
