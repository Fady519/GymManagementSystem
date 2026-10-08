import type { Metadata } from "next";
import { AdminOverview } from "@/features/dashboard/components/admin-overview";

export const metadata: Metadata = { title: "Dashboard" };

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function DashboardPage() {
  return <AdminOverview />;
}
