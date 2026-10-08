import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MemberCreateWizard } from "@/features/members/components/member-create-wizard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Members.wizard");
  return { title: t("title") };
}

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function NewMemberPage() {
  return <MemberCreateWizard />;
}
