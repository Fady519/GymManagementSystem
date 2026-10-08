import { Suspense } from "react";
import type { Metadata } from "next";
import { SetPasswordForm } from "@/features/auth/components/set-password-form";
import { FormSkeleton } from "@/features/auth/components/form-skeleton";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your Power Fitness account.",
};

/** Opened from the "reset your password" email: /reset-password?email=...&token=... */
export default function ResetPasswordPage() {
  return (
    // The form reads email and token from the URL, which is only known in the browser.
    <Suspense fallback={<FormSkeleton fields={2} />}>
      <SetPasswordForm mode="reset" />
    </Suspense>
  );
}
