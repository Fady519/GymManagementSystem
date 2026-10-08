import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MyProfile } from "@/features/member-profile/components/my-profile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MemberProfile");
  return { title: t("title") };
}

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function MyProfilePage() {
  return <MyProfile />;
}
