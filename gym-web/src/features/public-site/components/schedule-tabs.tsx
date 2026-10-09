"use client";

import { useMemo } from "react";
import { Clock, Timer, UserRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFormat } from "@/hooks/use-format";
import { Link } from "@/i18n/navigation";
import { cairoDayKey, GYM_TIME_ZONE, intlLocale } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SessionResponse } from "@/types";

const MAX_DAYS = 7;

/**
 * The coming classes grouped by Cairo day, one tab per day (up to 7 days).
 * "Book" opens the member booking page for that class; visitors who aren't logged in are sent to
 * the login page first and come back to it after signing in.
 */
export function ScheduleTabs({ sessions }: { sessions: SessionResponse[] }) {
  const t = useTranslations("Home.schedule");
  const tCommon = useTranslations("Common");
  const tFormat = useTranslations("Format");
  const locale = useLocale();
  const f = useFormat();

  // Group by day in Cairo time ("2026-10-08" -> classes), keeping the API's soonest-first order.
  const days = useMemo(() => {
    const groups = new Map<string, SessionResponse[]>();
    for (const session of sessions) {
      const key = cairoDayKey(session.startDate);
      if (!groups.has(key)) {
        if (groups.size === MAX_DAYS) break;
        groups.set(key, []);
      }
      groups.get(key)!.push(session);
    }
    return [...groups.entries()].map(([key, items]) => ({ key, items }));
  }, [sessions]);

  const weekday = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "short",
    timeZone: GYM_TIME_ZONE,
  });
  const dayNumber = new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    timeZone: GYM_TIME_ZONE,
  });

  return (
    <Tabs defaultValue={days[0].key} className="gap-6">
      <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto bg-transparent p-0 group-data-horizontal/tabs:h-auto">
        {days.map(({ key, items }) => {
          const date = new Date(items[0].startDate);
          return (
            <TabsTrigger
              key={key}
              value={key}
              className="h-auto min-w-24 flex-none flex-col gap-0.5 rounded-xl border-border bg-card px-4 py-2.5 data-active:border-primary data-active:bg-primary data-active:text-primary-foreground dark:data-active:border-primary dark:data-active:bg-primary"
            >
              <span className="text-xs font-medium">{weekday.format(date)}</span>
              <span className="text-base font-bold">{dayNumber.format(date)}</span>
              <span className="text-[11px]">{t("dayCount", { count: items.length })}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {days.map(({ key, items }) => (
        <TabsContent key={key} value={key}>
          <ul className="grid gap-3 md:grid-cols-2">
            {items.map((session) => {
              const full = session.availableSlots === 0;
              const almostFull = !full && session.availableSlots <= 3;
              const minutes = Math.round(
                (new Date(session.endDate).getTime() - new Date(session.startDate).getTime()) /
                  60_000,
              );

              return (
                <li
                  key={session.id}
                  className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-muted py-2">
                    <Clock className="mb-1 size-4 text-primary" />
                    <span className="text-sm font-bold tabular-nums" dir="ltr">
                      {f.time(session.startDate)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{session.categoryName}</Badge>
                      <span
                        className={cn(
                          "text-xs",
                          full
                            ? "font-medium text-destructive"
                            : almostFull
                              ? "font-medium text-warning"
                              : "text-muted-foreground",
                        )}
                      >
                        {full ? t("full") : tCommon("spotsLeft", { count: session.availableSlots })}
                      </span>
                    </div>
                    <p className="truncate font-semibold">{session.description}</p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UserRound className="size-3.5" />{" "}
                        {t("with", { name: session.trainerName })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="size-3.5" /> {tFormat("minutes", { count: minutes })}
                      </span>
                    </p>
                  </div>
                  {full ? (
                    <Button size="sm" variant="outline" disabled>
                      {t("full")}
                    </Button>
                  ) : (
                    <Button size="sm" asChild>
                      <Link href={`/me/classes?session=${session.id}`}>{t("book")}</Link>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </TabsContent>
      ))}
    </Tabs>
  );
}
