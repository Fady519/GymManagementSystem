import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown inside the app shell while the next logged-in page loads, so clicking a sidebar link
 * gives instant feedback (the sidebar stays, only the content area turns into grey blocks).
 * The shapes roughly match most pages: a title, a row of cards, then a table or list.
 */
export default function AppLoading() {
  const t = useTranslations("Common");

  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      {/* Screen readers hear "Loading page…" instead of a silent grey screen. */}
      <span className="sr-only">{t("loadingPage")}</span>

      <div className="flex flex-col gap-2" aria-hidden>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-80 rounded-xl" aria-hidden />
    </div>
  );
}
