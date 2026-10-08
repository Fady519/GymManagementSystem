import type { Metadata } from "next";
import { MemberOverview } from "@/features/member-portal/components/member-overview";

export const metadata: Metadata = { title: "My membership" };

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function MemberHomePage() {
  return <MemberOverview />;
}
