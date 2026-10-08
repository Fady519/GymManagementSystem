import { Suspense } from "react";
import type { Metadata } from "next";
import { SetPasswordForm } from "@/features/auth/components/set-password-form";
import { FormSkeleton } from "@/features/auth/components/form-skeleton";

export const metadata: Metadata = {
  title: "Activate your account",
  description: "Create a password to activate your Power Fitness account.",
};

/** Opened from the invitation email the gym sends to new staff and members: /set-password?email=...&token=... */
export default function SetPasswordPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={2} />}>
      <SetPasswordForm mode="invite" />
    </Suspense>
  );
}
