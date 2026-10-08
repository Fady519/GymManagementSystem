import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MemberBookings } from "@/features/member-portal/components/member-bookings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MemberPortal.bookings");
  return { title: t("title") };
}

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function MemberBookingsPage() {
  return <MemberBookings />;
}
