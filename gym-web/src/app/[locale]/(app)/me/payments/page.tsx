import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MyPayments } from "@/features/member-payments/components/my-payments";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MemberPayments");
  return { title: t("title") };
}

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function MyPaymentsPage() {
  return <MyPayments />;
}
