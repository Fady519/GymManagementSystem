import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MemberQrCard } from "@/features/member-portal/components/member-qr-card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MemberPortal.qr");
  return { title: t("title") };
}

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function MemberQrPage() {
  return <MemberQrCard />;
}
