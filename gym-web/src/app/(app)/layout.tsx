import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

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
  return <AppShell>{children}</AppShell>;
}
