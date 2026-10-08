"use client";

import { useState } from "react";
import {
  CalendarCheck2,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquareWarning,
  UserRoundCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { TimeRange } from "@/features/trainer-portal/components/class-ui";
import { attendanceOf, useMyHistory, useMyRoster } from "@/features/trainer-portal/queries";
import { useFormat } from "@/hooks/use-format";
import { Link } from "@/i18n/navigation";
import { GYM_TIME_ZONE, intlLocale } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SessionResponse } from "@/types";

const PAGE_SIZE = 10;

type PastState = "Completed" | "Cancelled";

/** /trainer/history: my past classes, Completed or Cancelled, 10 per page (paged by the API). */
export function ClassHistory() {
  const t = useTranslations("TrainerPortal.history");
  const f = useFormat();
  const [state, setState] = useState<PastState>("Completed");
  const [page, setPage] = useState(1);
  const history = useMyHistory(state, page, PAGE_SIZE);
  const data = history.data;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <Tabs
        value={state}
        onValueChange={(value) => {
          setState(value as PastState);
          setPage(1); // a different list starts on its first page
        }}
      >
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="Completed" className="px-4">
            <CalendarCheck2 /> {t("tabs.completed")}
          </TabsTrigger>
          <TabsTrigger value="Cancelled" className="px-4">
            <CalendarX2 /> {t("tabs.cancelled")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {history.isError ? (
        <QueryError
          title={t("loadError")}
          error={history.error}
          onRetry={() => void history.refetch()}
          retrying={history.isFetching}
        />
      ) : !data ? (
        <Card className="py-0">
          <ul className="divide-y" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="size-14 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : data.items.length === 0 ? (
        <Card>
          {state === "Completed" ? (
            <EmptyState
              icon={CalendarCheck2}
              title={t("emptyCompletedTitle")}
              description={t("emptyCompleted")}
            />
          ) : (
            <EmptyState
              icon={CalendarX2}
              title={t("emptyCancelledTitle")}
              description={t("emptyCancelled")}
            />
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          <Card
            className={cn("py-0 transition-opacity", history.isPlaceholderData && "opacity-60")}
          >
            <ul className="divide-y">
              {data.items.map((session) => (
                <HistoryRow key={session.id} session={session} />
              ))}
            </ul>
          </Card>

          <nav
            aria-label={t("pagination")}
            className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
          >
            <p>
              {t("pageOf", {
                page: f.number(data.page),
                pages: f.number(Math.max(1, data.totalPages)),
              })}
              {" · "}
              {t("total", { count: data.totalCount })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!data.hasPreviousPage || history.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="rtl:rotate-180" /> {t("previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!data.hasNextPage || history.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("next")} <ChevronRight className="rtl:rotate-180" />
              </Button>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}

/** One past class: a date block, the details and (for completed ones) who came. */
function HistoryRow({ session }: { session: SessionResponse }) {
  const t = useTranslations("TrainerPortal.history");
  const f = useFormat();
  const cancelled = session.state === "Cancelled";
  const date = new Date(session.startDate);
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocale(f.locale), { timeZone: GYM_TIME_ZONE, ...options }).format(
      date,
    );

  return (
    <li>
      <Link
        href={`/trainer/classes/${session.id}`}
        className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
      >
        <div
          className={cn(
            "flex size-14 shrink-0 flex-col items-center justify-center rounded-xl",
            cancelled ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
          )}
        >
          <span className="text-lg leading-none font-bold">{part({ day: "numeric" })}</span>
          <span className="text-xs font-medium">{part({ month: "short" })}</span>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="truncate font-medium">{session.description}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{part({ weekday: "long" })}</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              <TimeRange start={session.startDate} end={session.endDate} />
            </span>
            <Badge variant="secondary">{session.categoryName}</Badge>
          </p>
          {cancelled ? (
            <p className="flex items-start gap-1.5 text-sm text-destructive">
              <MessageSquareWarning className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span className="line-clamp-2">
                {session.cancelReason
                  ? t("cancelReason", { reason: session.cancelReason })
                  : t("noReason")}
              </span>
            </p>
          ) : (
            <Attendance sessionId={session.id} />
          )}
        </div>

        <ChevronRight
          className="size-5 shrink-0 text-muted-foreground rtl:rotate-180"
          aria-hidden
        />
      </Link>
    </li>
  );
}

/**
 * "6 of 8 attended" for a completed class. The list has no attendance numbers, so this reads the
 * class's roster (cached, and shared with the roster page and the home page's attendance tile).
 */
function Attendance({ sessionId }: { sessionId: number }) {
  const t = useTranslations("TrainerPortal.history");
  const f = useFormat();
  const roster = useMyRoster(sessionId);

  if (roster.isPending) return <Skeleton className="h-4 w-36" />;
  if (roster.isError) return null; // the row still links to the roster, which shows the error

  const { attended, expected } = attendanceOf(roster.data);
  if (expected === 0) return <p className="text-sm text-muted-foreground">{t("noBookings")}</p>;

  const percent = Math.round((attended / expected) * 100);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="flex items-center gap-1.5 font-medium">
        <UserRoundCheck className="size-3.5 text-success" aria-hidden />
        {t("attended", { attended: f.number(attended), booked: f.number(expected) })}
      </span>
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className="block h-full rounded-full bg-success" style={{ width: `${percent}%` }} />
      </span>
    </div>
  );
}
