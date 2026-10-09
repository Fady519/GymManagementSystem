"use client";

import { useEffect } from "react";
import { Home, RotateCcw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { StatusPage } from "@/components/shared/status-page";
import { Link } from "@/i18n/navigation";

/**
 * What a page shows when it crashes while rendering (a bug, not an API error: those are handled
 * on each page with QueryError and toasts). "Try again" asks Next.js to fetch and render the page again
 * (retry), without a full reload.
 * Used by app/[locale]/error.tsx and app/[locale]/(app)/error.tsx.
 */
export function ErrorView({
  error,
  retry,
  variant = "page",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  /** "inline" inside the logged-in shell, "page" everywhere else (see StatusPage). */
  variant?: "page" | "inline";
}) {
  const t = useTranslations("ErrorPage");

  useEffect(() => {
    // Shows up in the browser console for whoever is debugging; the digest matches the server log.
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      variant={variant}
      icon={TriangleAlert}
      title={t("title")}
      description={t("description")}
      actions={
        <>
          <Button onClick={retry}>
            <RotateCcw aria-hidden /> {t("retry")}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <Home aria-hidden /> {t("home")}
            </Link>
          </Button>
        </>
      }
      footnote={
        error.digest ? <span dir="ltr">{t("reference", { id: error.digest })}</span> : undefined
      }
    />
  );
}
