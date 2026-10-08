import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SetPasswordForm } from "@/features/auth/components/set-password-form";
import { FormSkeleton } from "@/features/auth/components/form-skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.invite");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/** Opened from the invitation email the gym sends to new staff and members: /set-password?email=...&token=... */
export default function SetPasswordPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={2} />}>
      <SetPasswordForm mode="invite" />
    </Suspense>
  );
}
