import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RegisterForm } from "@/features/auth/components/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.register");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default function RegisterPage() {
  return <RegisterForm />;
}
