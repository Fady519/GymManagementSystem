import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";
import { LoginNotice } from "@/features/auth/components/login-notice";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Power Fitness account.",
};

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
