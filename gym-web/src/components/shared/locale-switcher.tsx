"use client";

import { useTransition } from "react";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Switches between English and Arabic on the same page.
 * The path and query stay the same (/ar/dashboard/members?page=2 <-> /dashboard/members?page=2),
 * and next-intl remembers the choice in a cookie for the next visit.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const next = locale === "ar" ? "en" : "ar";

  const onSwitch = () => {
    // Read the query at click time (not with useSearchParams) so static pages stay static.
    const search = window.location.search;
    startTransition(() => router.replace(`${pathname}${search}`, { locale: next }));
  };

  return (
    // The accessible name must contain the visible word ("English" / "العربية") so voice-control
    // users can say what they see; the longer hint follows for screen readers only.
    <Button
      variant="outline"
      size="sm"
      onClick={onSwitch}
      disabled={pending}
      title={t("switchToLabel")}
      className={cn("gap-1.5 font-semibold", className)}
    >
      <Languages aria-hidden />
      <span lang={next}>{t("switchTo")}</span>
      <span className="sr-only">{t("switchToLabel")}</span>
    </Button>
  );
}
