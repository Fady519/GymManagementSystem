import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AccountSettings } from "@/features/account/components/account-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Account");
  return { title: t("title") };
}

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function AccountPage() {
  return <AccountSettings />;
}
