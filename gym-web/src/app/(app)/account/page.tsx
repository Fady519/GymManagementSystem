import type { Metadata } from "next";
import { AccountSettings } from "@/features/account/components/account-settings";

export const metadata: Metadata = { title: "Account settings" };

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function AccountPage() {
  return <AccountSettings />;
}
