import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MemberClasses } from "@/features/member-portal/components/member-classes";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MemberPortal.classes");
  return { title: t("title") };
}

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function MemberClassesPage() {
  return <MemberClasses />;
}
