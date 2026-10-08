import type { Metadata } from "next";
import { MemberCreateWizard } from "@/features/members/components/member-create-wizard";

export const metadata: Metadata = { title: "Add member" };

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function NewMemberPage() {
  return <MemberCreateWizard />;
}
