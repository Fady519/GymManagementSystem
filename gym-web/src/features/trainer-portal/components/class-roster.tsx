"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CalendarX2,
  Check,
  CircleCheck,
  CircleSlash,
  Clock,
  Info,
  Loader2,
  Phone,
  Search,
  SearchX,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryError } from "@/components/shared/query-error";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import {
  BookingBadge,
  CapacityBar,
  ClassStateBadge,
  TimeRange,
  liveState,
} from "@/features/trainer-portal/components/class-ui";
import {
  useMarkAttended,
  useMyRoster,
  useMySession,
  useMyTrainerProfile,
} from "@/features/trainer-portal/queries";
import { useFormat } from "@/hooks/use-format";
import { useNow } from "@/hooks/use-now";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api-error";
import { toastError } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { SessionBookingItem, SessionResponse, SessionState } from "@/types";

/** Show the search box only when scrolling the list would be slower than typing. */
const SEARCH_FROM = 9;

/** API error codes we can explain in the visitor's language (anything else shows the API's text). */
const ATTEND_ERRORS: Record<string, "attendanceNotOpen" | "notActive" | "notYours" | "notFound"> = {
  "Booking.AttendanceNotOpen": "attendanceNotOpen",
  "Booking.NotActive": "notActive",
  "Session.NotYours": "notYours",
  "Booking.NotFound": "notFound",
};

const isMissing = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.status === 403);

/** /trainer/classes/[id]: one of my classes with its roster, where I take attendance. */
export function ClassRoster() {
  const t = useTranslations("TrainerPortal.roster");
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const validId = Number.isInteger(id) && id > 0;

  const profile = useMyTrainerProfile();
  const session = useMySession(id);
  // Another trainer's class must look exactly like a missing one (the API would answer 403 anyway).
  const isMine = Boolean(
    session.data && profile.data && session.data.trainerId === profile.data.id,
  );
  const roster = useMyRoster(id, isMine);

  const back = (
    <Button variant="ghost" size="sm" className="-ms-2" asChild>
      <Link href="/trainer">
        <ArrowLeft className="rtl:rotate-180" /> {t("back")}
      </Link>
    </Button>
  );

  if (!validId || isMissing(session.error) || (session.data && profile.data && !isMine)) {
    return (
      <div className="space-y-6">
        {back}
        <Card>
          <EmptyState
            icon={CalendarX2}
            title={t("notFoundTitle")}
            description={t("notFound")}
            action={
              <Button asChild>
                <Link href="/trainer">{t("backToSchedule")}</Link>
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const loadError = session.error ?? profile.error;
  if (loadError) {
    const failed = session.isError ? session : profile;
    return (
      <div className="space-y-6">
        {back}
        <QueryError
          title={t("loadError")}
          error={loadError}
          onRetry={() => void failed.refetch()}
          retrying={failed.isFetching}
        />
      </div>
    );
  }

  if (!session.data || !profile.data) {
    return (
      <div className="space-y-6" aria-busy="true">
        {back}
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {back}
      <ClassHeader session={session.data} />
      {roster.isError ? (
        isMissing(roster.error) ? (
          <Card>
            <EmptyState icon={CalendarX2} title={t("notFoundTitle")} description={t("notFound")} />
          </Card>
        ) : (
          <QueryError
            title={t("rosterError")}
            error={roster.error}
            onRetry={() => void roster.refetch()}
            retrying={roster.isFetching}
          />
        )
      ) : roster.isPending ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <RosterCard session={session.data} bookings={roster.data} />
      )}
    </div>
  );
}

/** Title, badges and the key facts of the class. */
function ClassHeader({ session }: { session: SessionResponse }) {
  const t = useTranslations("TrainerPortal.roster");
  const f = useFormat();
  const state = liveState(session, useNow());

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ClassStateBadge state={state} />
            <Badge variant="secondary">{session.categoryName}</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{session.description}</h1>
        </div>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Fact icon={CalendarDays} label={t("date")}>
            {f.longDay(session.startDate)}
          </Fact>
          <Fact icon={Clock} label={t("time")}>
            <TimeRange start={session.startDate} end={session.endDate} />
          </Fact>
          <Fact icon={Users} label={t("capacity")}>
            {state === "Cancelled" ? (
              f.number(session.capacity)
            ) : (
              <CapacityBar
                booked={session.bookedCount}
                capacity={session.capacity}
                className="pt-1"
              />
            )}
          </Fact>
        </dl>
        {state === "Cancelled" && (
          <Alert variant="destructive">
            <CircleSlash />
            <AlertDescription>
              {t("hint.cancelled")}
              {session.cancelReason && (
                <span className="block font-medium">
                  {t("cancelReason", { reason: session.cancelReason })}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-lg bg-muted/50 p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium">{children}</dd>
      </div>
    </div>
  );
}

/** The roster: counts, the attendance hint, search and one row per booking. */
function RosterCard({
  session,
  bookings,
}: {
  session: SessionResponse;
  bookings: SessionBookingItem[];
}) {
  const t = useTranslations("TrainerPortal.roster");
  const f = useFormat();
  const now = useNow();
  const state = liveState(session, now);
  const [query, setQuery] = useState("");
  const markAttended = useMarkAttended(session.id);

  const counts = useMemo(
    () => ({
      booked: bookings.filter((b) => b.status !== "Cancelled").length,
      attended: bookings.filter((b) => b.status === "Attended").length,
      cancelled: bookings.filter((b) => b.status === "Cancelled").length,
    }),
    [bookings],
  );

  // Active bookings first (the API already sorts by name), cancelled ones at the bottom.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings
      .filter((b) => !q || b.memberName.toLowerCase().includes(q) || b.memberPhone.includes(q))
      .sort((a, b) => Number(a.status === "Cancelled") - Number(b.status === "Cancelled"));
  }, [bookings, query]);

  const onMark = async (booking: SessionBookingItem) => {
    try {
      await markAttended.mutateAsync(booking);
      toast.success(t("marked", { name: booking.memberName }));
    } catch (error) {
      const known = error instanceof ApiError && error.code ? ATTEND_ERRORS[error.code] : undefined;
      if (known) toast.error(t("markFailed"), { description: t(`errors.${known}`) });
      else toastError(t("markFailed"), error);
    }
  };

  const hintId = `attendance-hint-${session.id}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRoundCheck className="size-5 text-primary" aria-hidden />
          {t("members")}
        </CardTitle>
        <CardDescription>{t("membersDescription", { count: bookings.length })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Count label={t("counts.booked")} value={f.number(counts.booked)} />
          <Count label={t("counts.attended")} value={f.number(counts.attended)} tone="success" />
          <Count label={t("counts.cancelled")} value={f.number(counts.cancelled)} tone="muted" />
        </div>

        {state !== "Cancelled" && <AttendanceHint id={hintId} state={state} session={session} />}

        {bookings.length >= SEARCH_FROM && (
          <div className="relative">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              aria-label={t("searchLabel")}
              className="ps-9"
            />
          </div>
        )}

        {bookings.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("emptyTitle")}
            description={t("empty")}
            className="py-8"
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={t("noMatchTitle")}
            description={t("noMatch", { query: query.trim() })}
            className="py-8"
          />
        ) : (
          <ul className="divide-y rounded-xl border">
            {visible.map((booking) => (
              <RosterRow
                key={booking.bookingId}
                booking={booking}
                state={state}
                hintId={hintId}
                saving={
                  markAttended.isPending && markAttended.variables?.bookingId === booking.bookingId
                }
                busy={markAttended.isPending}
                onMark={() => void onMark(booking)}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Count({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: string;
  tone?: "primary" | "success" | "muted";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-center",
        tone === "primary" && "border-primary/20 bg-primary/5",
        tone === "success" && "border-success/30 bg-success/10",
        tone === "muted" && "bg-muted/50",
      )}
    >
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/** Explains when attendance can be taken, matching the API rule (only while the class runs). */
function AttendanceHint({
  id,
  state,
  session,
}: {
  id: string;
  state: Exclude<SessionState, "Cancelled">;
  session: SessionResponse;
}) {
  const t = useTranslations("TrainerPortal.roster");
  const f = useFormat();
  const values = {
    day: f.longDay(state === "Upcoming" ? session.startDate : session.endDate),
    start: f.time(session.startDate),
    end: f.time(session.endDate),
  };
  const Icon = state === "Ongoing" ? CircleCheck : Info;

  return (
    <Alert
      id={id}
      className={cn(state === "Ongoing" && "border-success/40 bg-success/5 [&>svg]:text-success")}
    >
      <Icon />
      <AlertDescription className="text-foreground">
        {state === "Upcoming"
          ? t("hint.upcoming", values)
          : state === "Ongoing"
            ? t("hint.ongoing", values)
            : t("hint.completed", values)}
      </AlertDescription>
    </Alert>
  );
}

function RosterRow({
  booking,
  state,
  hintId,
  saving,
  busy,
  onMark,
}: {
  booking: SessionBookingItem;
  state: SessionState;
  hintId: string;
  saving: boolean;
  busy: boolean;
  onMark: () => void;
}) {
  const t = useTranslations("TrainerPortal.roster");
  const f = useFormat();
  const cancelled = booking.status === "Cancelled";
  // The button only makes sense for a live booking before or during the class.
  const showButton = booking.status === "Booked" && (state === "Upcoming" || state === "Ongoing");

  return (
    <li
      className={cn(
        "flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4",
        cancelled && "bg-muted/30",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <MemberAvatar
          name={booking.memberName}
          photoUrl={null}
          className={cn(cancelled && "opacity-60")}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate font-medium",
              cancelled && "text-muted-foreground line-through",
            )}
          >
            {booking.memberName}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <a
              href={`tel:${booking.memberPhone}`}
              dir="ltr"
              className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
              aria-label={t("callMember", { name: booking.memberName })}
            >
              <Phone className="size-3" aria-hidden />
              {booking.memberPhone}
            </a>
            <span>{t("bookedAt", { date: f.dateTime(booking.bookedAt) })}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 ps-12 sm:justify-end sm:ps-0">
        <BookingBadge status={booking.status} classEnded={state === "Completed"} />
        {showButton && (
          <Button
            size="sm"
            onClick={onMark}
            disabled={state !== "Ongoing" || busy}
            aria-describedby={hintId}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            {saving ? t("marking") : t("markAttended")}
          </Button>
        )}
        {booking.status === "Attended" && (
          <CircleCheck className="size-5 text-success" aria-hidden />
        )}
      </div>
    </li>
  );
}
