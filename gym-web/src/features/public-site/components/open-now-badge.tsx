"use client";

import { useLocale, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { openState, weekdayName } from "@/features/public-site/hours";
import type { GymSettingsResponse } from "@/types";

type Hours = Pick<
  GymSettingsResponse,
  "weekdayOpensAt" | "weekdayClosesAt" | "fridayOpensAt" | "fridayClosesAt"
>;

/**
 * "Open now · until 23:00" or "Closed now · opens tomorrow at 06:00", from the hours the admin
 * saved in Gym settings. It depends on the clock, so it only renders in the browser (see useNow)
 * and refreshes itself every minute.
 */
export function OpenNowBadge({ hours, className }: { hours: Hours; className?: string }) {
  const t = useTranslations("Home.openNow");
  const locale = useLocale();
  const now = useNow();

  if (!now) return <Skeleton className={cn("h-8 w-56 rounded-full", className)} />;

  const state = openState(hours, now);
  if (!state) return null;

  const label = state.open
    ? t("open", { time: state.closes })
    : state.when === "today"
      ? t("opensToday", { time: state.opens })
      : state.when === "tomorrow"
        ? t("opensTomorrow", { time: state.opens })
        : t("opensOn", { day: weekdayName(state.weekday, locale), time: state.opens });

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-sm font-medium backdrop-blur",
        className,
      )}
    >
      <span className="relative flex size-2.5">
        {state.open && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
        )}
        <span
          className={cn(
            "relative inline-flex size-2.5 rounded-full",
            state.open ? "bg-success" : "bg-destructive",
          )}
        />
      </span>
      {label}
    </span>
  );
}
