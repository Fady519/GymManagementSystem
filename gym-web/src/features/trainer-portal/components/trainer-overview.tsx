"use client";

import { useMemo } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  Clock,
  Coffee,
  Dumbbell,
  History,
  Percent,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { StatCard, StatCardSkeleton } from "@/components/shared/stat-card";
import { useAuth } from "@/features/auth/hooks";
import {
  ClassCard,
  ClassStateBadge,
  TimeRange,
  liveState,
} from "@/features/trainer-portal/components/class-ui";
import {
  useMyTrainerProfile,
  useMyWeek,
  useRecentAttendance,
} from "@/features/trainer-portal/queries";
import { useFormat } from "@/hooks/use-format";
import { useNow } from "@/hooks/use-now";
import { Link } from "@/i18n/navigation";
import { cairoDayKey, firstName } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SessionResponse, SessionState } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

const DOT_COLOR: Record<SessionState, string> = {
  Upcoming: "bg-primary",
  Ongoing: "bg-success",
  Completed: "bg-muted-foreground/50",
  Cancelled: "bg-destructive",
};

/** The trainer home page: what's live, today's timeline, the rest of the week and a few KPIs. */
export function TrainerOverview() {
  const t = useTranslations("TrainerPortal.overview");
  const f = useFormat();
  const now = useNow();
  const { user } = useAuth();
  const profile = useMyTrainerProfile();

  // The next 7 Cairo days ("2026-10-08", ...), today first. Empty until the browser knows the time.
  const dayKeys = useMemo(
    () =>
      now
        ? Array.from({ length: 7 }, (_, i) => cairoDayKey(new Date(now.getTime() + i * DAY_MS)))
        : [],
    [now],
  );
  const todayKey = dayKeys[0] ?? null;
  const week = useMyWeek(todayKey);
  const attendance = useRecentAttendance();

  const view = useMemo(() => {
    const items = week.data?.items ?? [];
    const withState = items.map((s) => ({
      session: s,
      state: liveState(s, now),
      day: cairoDayKey(s.startDate),
    }));
    const inWeek = withState.filter((x) => dayKeys.includes(x.day));
    const active = inWeek.filter((x) => x.state !== "Cancelled");
    const today = withState.filter((x) => x.day === todayKey);
    const upcoming = active.filter((x) => x.state === "Upcoming");

    return {
      live: withState.filter((x) => x.state === "Ongoing").map((x) => x.session),
      today: today.map((x) => x.session),
      todayActive: today.filter((x) => x.state !== "Cancelled").length,
      // Still to teach today: the class running now counts too.
      todayLeft: today.filter((x) => x.state === "Upcoming" || x.state === "Ongoing").length,
      weekActive: active.length,
      upcomingCount: upcoming.length,
      booked: upcoming.reduce((sum, x) => sum + x.session.bookedCount, 0),
      capacity: upcoming.reduce((sum, x) => sum + x.session.capacity, 0),
      // Tomorrow .. 6 days ahead, only days that have classes.
      laterDays: dayKeys
        .slice(1)
        .map((key) => ({
          key,
          sessions: inWeek.filter((x) => x.day === key).map((x) => x.session),
        }))
        .filter((g) => g.sessions.length > 0),
    };
  }, [week.data, now, dayKeys, todayKey]);

  const name = firstName(profile.data?.name ?? user?.fullName ?? "");
  const hello = now ? f.greeting(now) : t("welcome");
  const fillPercent = view.capacity > 0 ? Math.round((view.booked / view.capacity) * 100) : 0;
  const attendanceRate =
    attendance.expected > 0 ? Math.round((attendance.attended / attendance.expected) * 100) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={name ? t("greeting", { greeting: hello, name }) : hello}
        description={
          <div className="space-y-0.5">
            {profile.isPending ? (
              <Skeleton className="h-5 w-64 max-w-full" />
            ) : (
              <p>
                {profile.data
                  ? t.rich("coaching", {
                      category: profile.data.categoryName,
                      b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
                    })
                  : t("intro")}
              </p>
            )}
            {now && <p className="text-sm">{f.longDay(now)}</p>}
          </div>
        }
        actions={
          <Button variant="outline" asChild>
            <Link href="/trainer/history">
              <History /> {t("viewHistory")}
            </Link>
          </Button>
        }
      />

      {week.isError ? (
        <QueryError
          title={t("loadError")}
          error={week.error}
          onRetry={() => void week.refetch()}
          retrying={week.isFetching}
        />
      ) : week.isPending ? (
        <OverviewSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              icon={CalendarCheck2}
              label={t("kpi.today")}
              value={f.number(view.todayActive)}
              hint={
                view.todayActive === 0
                  ? t("kpi.todayNone")
                  : t("kpi.todayLeft", { count: view.todayLeft })
              }
            />
            <StatCard
              icon={CalendarRange}
              label={t("kpi.week")}
              value={f.number(view.weekActive)}
              hint={t("kpi.weekHint")}
            />
            <StatCard
              icon={Users}
              label={t("kpi.booked")}
              value={
                <span dir="ltr">
                  {f.number(view.booked)}
                  <span className="text-lg font-semibold text-muted-foreground">
                    {" "}
                    / {f.number(view.capacity)}
                  </span>
                </span>
              }
              hint={
                view.upcomingCount === 0
                  ? t("kpi.bookedNone")
                  : t("kpi.bookedHint", {
                      percent: f.percent(fillPercent),
                      count: view.upcomingCount,
                    })
              }
              tone="success"
            />
            {attendance.isPending ? (
              <StatCardSkeleton />
            ) : (
              <StatCard
                icon={Percent}
                label={t("kpi.attendance")}
                value={
                  attendanceRate === null || attendance.isError ? "—" : f.percent(attendanceRate)
                }
                hint={
                  attendance.isError
                    ? t("kpi.attendanceError")
                    : attendanceRate === null
                      ? t("kpi.attendanceNone")
                      : t("kpi.attendanceHint", { count: attendance.classes })
                }
                tone="warning"
              />
            )}
          </div>

          {view.live.map((session) => (
            <LiveClassCard key={session.id} session={session} />
          ))}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-5 text-primary" aria-hidden />
                  {t("today.title")}
                </CardTitle>
                <CardDescription>{now ? f.longDay(now) : null}</CardDescription>
              </CardHeader>
              <CardContent>
                {view.today.length === 0 ? (
                  <EmptyState
                    icon={Coffee}
                    title={t("today.emptyTitle")}
                    description={t("today.empty")}
                    className="py-8"
                  />
                ) : (
                  // A simple timeline: a line down the start side with one colored dot per class.
                  <ol className="relative space-y-3">
                    <span aria-hidden className="absolute inset-y-3 start-[5px] w-px bg-border" />
                    {view.today.map((session) => (
                      <li key={session.id} className="relative ps-6">
                        <span
                          aria-hidden
                          className={cn(
                            "absolute start-0 top-5 size-[11px] rounded-full ring-4 ring-card",
                            DOT_COLOR[liveState(session, now)],
                          )}
                        />
                        <ClassCard session={session} now={now} />
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarRange className="size-5 text-primary" aria-hidden />
                  {t("upcoming.title")}
                </CardTitle>
                <CardDescription>{t("upcoming.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                {view.laterDays.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title={t("upcoming.emptyTitle")}
                    description={t("upcoming.empty")}
                    className="py-8"
                  />
                ) : (
                  <div className="space-y-6">
                    {view.laterDays.map((group) => (
                      <section key={group.key} className="space-y-2.5">
                        <h3 className="flex items-baseline justify-between gap-2 text-sm font-semibold">
                          <span>
                            {group.key === dayKeys[1] && (
                              <span className="text-primary">{t("upcoming.tomorrow")} · </span>
                            )}
                            {f.longDay(group.sessions[0].startDate)}
                          </span>
                          <span className="shrink-0 text-xs font-normal text-muted-foreground">
                            {t("upcoming.dayCount", { count: group.sessions.length })}
                          </span>
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                          {group.sessions.map((session) => (
                            <ClassCard key={session.id} session={session} now={now} />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

/** The class that is running right now, with a big button to take attendance. */
function LiveClassCard({ session }: { session: SessionResponse }) {
  const t = useTranslations("TrainerPortal.overview");
  const f = useFormat();

  return (
    <Card className="border-success/40 bg-success/5">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-success">{t("now.title")}</span>
            <ClassStateBadge state="Ongoing" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">{session.description}</h2>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />
              <TimeRange start={session.startDate} end={session.endDate} />
            </span>
            <span className="flex items-center gap-1.5">
              <Dumbbell className="size-4" aria-hidden />
              <Badge variant="secondary">{session.categoryName}</Badge>
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-4" aria-hidden />
              {t("now.booked", { count: session.bookedCount })}
            </span>
          </p>
          <p className="text-sm">{t("now.endsAt", { time: f.time(session.endDate) })}</p>
        </div>
        <Button size="lg" className="w-full sm:w-auto" asChild>
          <Link href={`/trainer/classes/${session.id}`}>
            <ClipboardCheck /> {t("now.cta")}
            <ArrowRight className="rtl:rotate-180" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
