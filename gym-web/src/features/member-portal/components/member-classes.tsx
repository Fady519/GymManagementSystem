"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarX2, Clock, Loader2, Timer, TriangleAlert, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { useCategories } from "@/features/categories/queries";
import {
  CANCELLATION_DEADLINE_HOURS,
  cancelDeadline,
  isCovered,
  overlaps,
} from "@/features/member-portal/booking-rules";
import { CancelBookingButton } from "@/features/member-portal/components/cancel-booking-button";
import { useBookSession, useMyBookings, useMyMemberships } from "@/features/member-portal/queries";
import { useSessions } from "@/features/sessions/queries";
import { useFormat } from "@/hooks/use-format";
import { useNow } from "@/hooks/use-now";
import { addDays, cairoToday, cairoToUtc } from "@/lib/cairo-time";
import { cairoDayKey } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { MembershipResponse, MyBookingItem, SessionResponse } from "@/types";

const PAGE_SIZE = 30;
const DAYS_AHEAD = 7;
const ALL = "all";

/** The class id from "?session=12" (set by the Book buttons on the website), read once. */
function sessionFromUrl(): number | null {
  if (typeof window === "undefined") return null;
  return Number(new URLSearchParams(window.location.search).get("session")) || null;
}

/**
 * Member booking page: the coming week's classes with live spots, filters by program and day,
 * and a Book / Cancel button on each class. Every button state mirrors a rule the API checks,
 * so members see WHY they can't book before they try.
 */
export function MemberClasses() {
  const t = useTranslations("MemberPortal.classes");
  const f = useFormat();
  const now = useNow();
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const [day, setDay] = useState<string>(ALL);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [highlightId] = useState(sessionFromUrl);

  const today = now ? cairoToday(now) : null;
  const days = today ? Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)) : [];

  const categories = useCategories();
  const memberships = useMyMemberships();
  const myBookings = useMyBookings(true, 1, 100);
  const sessions = useSessions(
    {
      state: "Upcoming",
      trainerId: null,
      categoryId: categoryId === ALL ? null : Number(categoryId),
      from: day === ALL ? null : cairoToUtc(day),
      to: today ? cairoToUtc(day === ALL ? addDays(today, DAYS_AHEAD) : addDays(day, 1)) : null,
      page: 1,
      pageSize,
    },
    today !== null,
  );

  // The member's active bookings by class id, to show "You're booked" + Cancel on those classes.
  const bookedBySession = useMemo(
    () => new Map((myBookings.data?.items ?? []).map((b) => [b.sessionId, b])),
    [myBookings.data],
  );

  // Scroll to the class picked on the website once it's on screen.
  useEffect(() => {
    if (!highlightId || !sessions.data) return;
    document
      .getElementById(`class-${highlightId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, sessions.data]);

  const hasAnyMembership = memberships.data?.some(
    (m) => m.state === "Active" || m.state === "Upcoming" || m.state === "Frozen",
  );

  // Classes grouped by Cairo day, in the API's soonest-first order.
  const groups = useMemo(() => {
    const map = new Map<string, SessionResponse[]>();
    for (const s of sessions.data?.items ?? []) {
      const key = cairoDayKey(s.startDate);
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()];
  }, [sessions.data]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {memberships.data && !hasAnyMembership && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>{t("noMembershipTitle")}</AlertTitle>
          <AlertDescription>{t("noMembershipBody")}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-full sm:w-52" aria-label={t("program")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allPrograms")}</SelectItem>
            {categories.data?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div
          role="group"
          aria-label={t("day")}
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          <DayChip active={day === ALL} onClick={() => setDay(ALL)}>
            {t("allDays")}
          </DayChip>
          {days.map((d) => (
            <DayChip key={d} active={day === d} onClick={() => setDay(d)}>
              {/* Noon UTC keeps the date the same in Cairo whatever the time zone. */}
              {f.day(`${d}T12:00:00Z`)}
            </DayChip>
          ))}
        </div>
      </div>

      {sessions.isPending ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : sessions.isError ? (
        <QueryError
          title={t("loadError")}
          error={sessions.error}
          onRetry={() => void sessions.refetch()}
          retrying={sessions.isFetching}
        />
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
          <CalendarX2 className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">{t("empty")}</p>
          {(day !== ALL || categoryId !== ALL) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDay(ALL);
                setCategoryId(ALL);
              }}
            >
              {t("clearFilters")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([key, items]) => (
            <section key={key} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {f.longDay(items[0].startDate)}
              </h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {items.map((session) => (
                  <ClassCard
                    key={session.id}
                    session={session}
                    booking={bookedBySession.get(session.id)}
                    myBookings={myBookings.data?.items ?? []}
                    memberships={memberships.data ?? []}
                    highlighted={session.id === highlightId}
                  />
                ))}
              </ul>
            </section>
          ))}

          {sessions.data.hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setPageSize((n) => n + PAGE_SIZE)}
                disabled={sessions.isFetching}
              >
                {sessions.isFetching && <Loader2 className="animate-spin" />}
                {t("showMore")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DayChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function ClassCard({
  session,
  booking,
  myBookings,
  memberships,
  highlighted,
}: {
  session: SessionResponse;
  booking: MyBookingItem | undefined;
  myBookings: MyBookingItem[];
  memberships: MembershipResponse[];
  highlighted: boolean;
}) {
  const t = useTranslations("MemberPortal.classes");
  const tCommon = useTranslations("Common");
  const tFormat = useTranslations("Format");
  const f = useFormat();
  const book = useBookSession();
  const now = useNow();

  const full = session.availableSlots === 0;
  // Booking inside the last 2 hours is allowed, but it can't be cancelled online any more: say so first.
  const lateBooking =
    now !== null && cancelDeadline({ sessionStartDate: session.startDate }) <= now;
  const almostFull = !full && session.availableSlots <= 3;
  const covered = isCovered(memberships, session);
  const busy =
    !booking &&
    myBookings.some((b) =>
      overlaps(
        { start: b.sessionStartDate, end: b.sessionEndDate },
        { start: session.startDate, end: session.endDate },
      ),
    );
  const minutes = Math.round(
    (new Date(session.endDate).getTime() - new Date(session.startDate).getTime()) / 60_000,
  );

  const onBook = async () => {
    try {
      await book.mutateAsync(session.id);
      toast.success(t("bookedToast"), {
        description: t("bookedToastBody", {
          name: session.description,
          date: f.classTime(session.startDate),
        }),
      });
    } catch (error) {
      toastError(t("bookError"), error);
    }
  };

  return (
    <li
      id={`class-${session.id}`}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border bg-card p-4 transition-shadow sm:flex-row sm:items-center",
        booking && "border-success/40 bg-success/5",
        highlighted && "ring-2 ring-primary",
      )}
    >
      <div className="flex min-w-0 flex-1 gap-4">
        <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-muted py-2">
          <Clock className="mb-1 size-4 text-primary" />
          <span className="text-sm font-bold tabular-nums" dir="ltr">
            {f.time(session.startDate)}
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{session.categoryName}</Badge>
            {highlighted && <Badge variant="outline">{t("fromWebsite")}</Badge>}
            {booking ? (
              <Badge className="bg-success text-white">{t("booked")}</Badge>
            ) : (
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
            )}
          </div>
          <p className="truncate font-semibold">{session.description}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <UserRound className="size-3.5" /> {t("with", { name: session.trainerName })}
            </span>
            <span className="flex items-center gap-1">
              <Timer className="size-3.5" /> {tFormat("minutes", { count: minutes })}
            </span>
          </p>
        </div>
      </div>

      <div className="flex shrink-0 justify-end">
        {booking ? (
          <CancelBookingButton
            bookingId={booking.id}
            classTitle={session.description}
            startDate={session.startDate}
          />
        ) : full ? (
          <Button size="sm" variant="outline" disabled>
            {t("full")}
          </Button>
        ) : !covered ? (
          <div className="flex flex-col items-end gap-1 text-end">
            <Button size="sm" variant="outline" disabled>
              {t("needsMembership")}
            </Button>
            <p className="max-w-56 text-xs text-muted-foreground">{t("needsMembershipHint")}</p>
          </div>
        ) : busy ? (
          <Button size="sm" variant="outline" disabled>
            {t("busy")}
          </Button>
        ) : (
          <div className="flex flex-col items-end gap-1 text-end">
            <Button size="sm" onClick={() => void onBook()} disabled={book.isPending}>
              {book.isPending && <Loader2 className="animate-spin" />}
              {t("book")}
            </Button>
            {lateBooking && (
              <p className="max-w-56 text-xs text-warning">
                {t("lateBookingHint", { hours: CANCELLATION_DEADLINE_HOURS })}
              </p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
