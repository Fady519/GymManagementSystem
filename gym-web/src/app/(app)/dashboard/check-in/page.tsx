import type { Metadata } from "next";
import { CheckInDesk } from "@/features/check-ins/components/check-in-desk";

export const metadata: Metadata = { title: "Check-in desk" };

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function CheckInPage() {
  return <CheckInDesk />;
}
