"use client";

import { CalendarClock, CalendarX2, Clock, Dumbbell, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { StatCard, StatCardSkeleton } from "@/components/shared/stat-card";
import { useAuth } from "@/features/auth/hooks";
import { useMyTrainerProfile, useMyUpcomingSessions } from "@/features/trainer-portal/queries";
import { GYM_TIME_ZONE, firstName, formatDay, formatTime, greeting } from "@/lib/format";
import type { SessionResponse } from "@/types";

const dayFormat = new Intl.DateTimeFormat("en-GB", { timeZone: GYM_TIME_ZONE, day: "numeric" });
const monthFormat = new Intl.DateTimeFormat("en-GB", { timeZone: GYM_TIME_ZONE, month: "short" });

/** One class in the list: a date block, the details and how full it is. */
function SessionRow({ session }: { session: SessionResponse }) {
  const fillPercent =
    session.capacity > 0 ? Math.round((session.bookedCount / session.capacity) * 100) : 0;
  const isFull = session.availableSlots === 0;

  return (
    <li className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4 sm:flex-1">
        <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
          <span className="text-lg leading-none font-bold">
            {dayFormat.format(new Date(session.startDate))}
          </span>
          <span className="text-xs font-medium uppercase">
            {monthFormat.format(new Date(session.startDate))}
          </span>
        </div>
        <div className="min-w-0 space-y-1">
          <p className="truncate font-semibold">{session.description}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {formatTime(session.startDate)} – {formatTime(session.endDate)}
            </span>
            <span className="flex items-center gap-1">
              <Dumbbell className="size-3.5" />
              {session.categoryName}
            </span>
          </p>
        </div>
      </div>
      <div className="space-y-1.5 sm:w-48">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {session.bookedCount} / {session.capacity} booked
          </span>
          {isFull && <Badge>Full</Badge>}
        </div>
        <Progress value={fillPercent} aria-label={`${fillPercent}% booked`} />
      </div>
    </li>
  );
}

/** The trainer home page: their specialty, the next class and the upcoming schedule with live bookings. */
export function TrainerOverview() {
  const { user } = useAuth();
  const profile = useMyTrainerProfile();
  const sessions = useMyUpcomingSessions(5);

  const items = sessions.data?.items ?? [];
  const next = items[0];
  const booked = items.reduce((sum, s) => sum + s.bookedCount, 0);
  const capacity = items.reduce((sum, s) => sum + s.capacity, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${firstName(user?.fullName ?? "")}`}
        description={
          profile.isPending ? (
            <Skeleton className="h-5 w-56" />
          ) : profile.data ? (
            <>
              You coach{" "}
              <span className="font-medium text-foreground">{profile.data.categoryName}</span>.
              Here&apos;s what&apos;s coming up.
            </>
          ) : (
            "Here's what's coming up."
          )
        }
      />

      {sessions.isPending ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : sessions.isError ? (
        <QueryError
          title="We couldn't load your schedule"
          error={sessions.error}
          onRetry={() => void sessions.refetch()}
          retrying={sessions.isFetching}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={CalendarClock}
              label="Next class"
              value={next ? formatTime(next.startDate) : "—"}
              hint={next ? formatDay(next.startDate) : "Nothing scheduled yet"}
            />
            <StatCard
              icon={Dumbbell}
              label="Upcoming classes"
              value={sessions.data.totalCount}
              hint="Assigned to you"
            />
            <StatCard
              icon={Users}
              label="Spots booked"
              value={capacity > 0 ? `${booked} / ${capacity}` : "—"}
              hint={
                items.length > 0 ? `Across your next ${items.length} classes` : "No classes yet"
              }
              tone="success"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your next classes</CardTitle>
              <CardDescription>Bookings update live while this page is open.</CardDescription>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <CalendarX2 className="size-10 text-muted-foreground" />
                  <p className="font-medium">No upcoming classes</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    When the gym schedules a class for you, it will appear here with its bookings.
                  </p>
                </div>
              ) : (
                <ul className="divide-y">
                  {items.map((session) => (
                    <SessionRow key={session.id} session={session} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
