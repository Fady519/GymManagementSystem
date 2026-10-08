"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/hooks";
import { useHydrated } from "@/hooks/use-hydrated";
import { Link } from "@/i18n/navigation";
import { AREA_HOME } from "@/lib/roles";

/**
 * The buttons on the right of the public header:
 * visitors see "Log in" and "Join now", logged-in users get a button back to their area.
 */
export function AuthNavButtons() {
  const t = useTranslations("AuthNav");
  const { status, area } = useAuth();
  const hydrated = useHydrated();

  // While the session is being restored, keep the space so the header doesn't jump.
  if (!hydrated || status === "unknown") return <Skeleton className="h-8 w-36" />;

  if (status === "authenticated" && area) {
    return (
      <Button asChild>
        <Link href={AREA_HOME[area]}>
          {t(`home.${area}`)} <ArrowRight className="rtl:rotate-180" />
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" asChild>
        <Link href="/login">{t("logIn")}</Link>
      </Button>
      <Button asChild>
        <Link href="/register">{t("joinNow")}</Link>
      </Button>
    </div>
  );
}
