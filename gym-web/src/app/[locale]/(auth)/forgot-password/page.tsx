import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.forgot");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
