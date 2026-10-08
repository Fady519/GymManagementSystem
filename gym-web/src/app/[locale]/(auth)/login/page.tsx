import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/features/auth/components/login-form";
import { LoginNotice } from "@/features/auth/components/login-notice";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.login");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default function LoginPage() {
  return (
    <>
      {/* The notice reads the URL (?expired=1 ...), so it waits for the browser; the form doesn't. */}
      <Suspense fallback={null}>
        <LoginNotice />
      </Suspense>
      <LoginForm />
    </>
  );
}
