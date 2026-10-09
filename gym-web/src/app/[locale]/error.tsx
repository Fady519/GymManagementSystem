"use client"; // Error boundaries must be Client Components (they use React state to catch errors).

import { ErrorView } from "@/components/shared/error-view";

/**
 * Catches a crash in any public page (home, login, register...) and shows a friendly message
 * inside the normal site layout instead of a blank screen. The logged-in area has its own
 * error.tsx so the sidebar stays visible there.
 */
export default function LocaleError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorView error={error} retry={retry} />;
}
