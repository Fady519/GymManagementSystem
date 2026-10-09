import { Suspense } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorMessagesBridge } from "@/components/shared/error-messages-bridge";
import { LoadingScreen } from "@/components/shared/loading-screen";

// Private pages: keep them out of search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// The access token lives only in browser memory, so these pages can only render after the
// session is restored in the browser (AppShell shows a loading screen until then). That is by
// design, so we tell Next.js not to expect them to be prerendered for instant navigation.
export const instant = false;

/** Every logged-in page (/dashboard, /trainer, /me, /account) shares this frame and its guard. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  // AppShell reads the current path (usePathname). On pages with a dynamic part in the URL,
  // such as /dashboard/members/[id], the path is unknown at build time, so Next.js needs a
  // Suspense boundary here. The fallback is the same loading screen the shell shows anyway.
  return (
    // All messages here (the root layout only sends the ones the public pages need), plus the
    // bridge that lets API errors and toasts speak the visitor's language.
    <NextIntlClientProvider>
      <ErrorMessagesBridge />
      <Suspense fallback={<LoadingScreen />}>
        <AppShell>{children}</AppShell>
      </Suspense>
    </NextIntlClientProvider>
  );
}
