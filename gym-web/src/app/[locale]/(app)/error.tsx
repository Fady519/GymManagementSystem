"use client"; // Error boundaries must be Client Components (they use React state to catch errors).

import { ErrorView } from "@/components/shared/error-view";

/**
 * Catches a crash in a logged-in page. It sits inside (app)/layout.tsx, so the sidebar and top
 * bar stay on screen and the user can simply open another page instead of being thrown out.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorView error={error} retry={retry} variant="inline" />;
}
