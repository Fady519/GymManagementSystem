"use client";

import { useTranslations } from "next-intl";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { cairoClock, hoursOn } from "@/features/public-site/hours";
import type { GymSettingsResponse } from "@/types";

type Hours = Pick<
  GymSettingsResponse,
  "weekdayOpensAt" | "weekdayClosesAt" | "fridayOpensAt" | "fridayClosesAt"
>;

/** The two rows of opening hours. Today's row is highlighted once the page runs in the browser. */
export function OpeningHours({ hours }: { hours: Hours }) {
  const t = useTranslations("Home.contact");
  const now = useNow();
  const todayIsFriday = now ? cairoClock(now).weekday === 5 : null;

  const rows = [
    {
      key: "weekdays",
      label: t("weekdays"),
      value: hoursOn(hours, 6),
      isToday: todayIsFriday === false,
    },
    {
      key: "friday",
      label: t("friday"),
      value: hoursOn(hours, 5),
      isToday: todayIsFriday === true,
    },
  ];

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li
          key={row.key}
          className={cn(
            "flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-sm",
            row.isToday ? "bg-primary/10 font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          <span className="flex items-center gap-2">
            {row.label}
            {row.isToday && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {t("today")}
              </span>
            )}
          </span>
          {row.value ? (
            <span dir="ltr" className="tabular-nums">
              {row.value.opens} – {row.value.closes}
            </span>
          ) : (
            <span>{t("closed")}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
