import type { Metadata } from "next";
import { TrainerOverview } from "@/features/trainer-portal/components/trainer-overview";

export const metadata: Metadata = { title: "My schedule" };

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function TrainerHomePage() {
  return <TrainerOverview />;
}
