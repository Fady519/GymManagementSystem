import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Get a link to reset your Power Fitness password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
