import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SetPasswordForm } from "@/features/auth/components/set-password-form";
import { FormSkeleton } from "@/features/auth/components/form-skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.reset");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/** Opened from the "reset your password" email: /reset-password?email=...&token=... */
export default function ResetPasswordPage() {
  return (
    // The form reads email and token from the URL, which is only known in the browser.
    <Suspense fallback={<FormSkeleton fields={2} />}>
      <SetPasswordForm mode="reset" />
    </Suspense>
  );
}
