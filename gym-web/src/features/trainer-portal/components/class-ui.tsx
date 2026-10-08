"use client";

import { ChevronRight, Clock, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { SESSION_STATE_STYLE } from "@/features/sessions/components/session-badges";
import { useFormat } from "@/hooks/use-format";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { BookingStatus, SessionResponse, SessionState } from "@/types";

/**
 * The state of a class right now. The API computes `state` when the list was loaded, but a page
 * can stay open for an hour, so we recompute it from the times (same rule as the API:
 * running while start <= now < end). `now` is null before the browser knows the time.
 */
export function liveState(session: SessionResponse, now: Date | null): SessionState {
  if (session.state === "Cancelled" || now === null) return session.state;
  const time = now.getTime();
  if (time < new Date(session.startDate).getTime()) return "Upcoming";
  if (time < new Date(session.endDate).getTime()) return "Ongoing";
  return "Completed";
}

/** "Upcoming" / "Live now" / "Completed" / "Cancelled", in the same colors as the admin calendar. */
export function ClassStateBadge({ state, className }: { state: SessionState; className?: string }) {
  const t = useTranslations("TrainerPortal.states");
  return (
    <Badge variant="outline" className={cn(SESSION_STATE_STYLE[state].badge, className)}>
      {state === "Ongoing" && (
        <span className="relative flex size-1.5" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-success" />
        </span>
      )}
      {t(state)}
    </Badge>
  );
}

const BOOKING_STYLE: Record<BookingStatus | "Missed", string> = {
  Booked: "border-primary/30 bg-primary/10 text-primary",
  Attended: "border-success/30 bg-success/15 text-success",
  Cancelled: "border-border bg-muted text-muted-foreground",
  Missed: "border-warning/40 bg-warning/10 text-amber-700 dark:text-warning",
};

/** A booking's status. Still "Booked" after the class ended means the member didn't come. */
export function BookingBadge({
  status,
  classEnded,
}: {
  status: BookingStatus;
  classEnded: boolean;
}) {
  const t = useTranslations("TrainerPortal.bookingStatus");
  const shown = status === "Booked" && classEnded ? "Missed" : status;
  return (
    <Badge variant="outline" className={BOOKING_STYLE[shown]}>
      {t(shown)}
    </Badge>
  );
}

/** "18:00 – 19:00" in Cairo time. Always left-to-right so the range reads the same in Arabic. */
export function TimeRange({ start, end }: { start: string; end: string }) {
  const f = useFormat();
  return (
    <span dir="ltr" className="tabular-nums">
      {f.time(start)} – {f.time(end)}
    </span>
  );
}

/**
 * How full a class is: a bar plus "7 / 12". Uses a width (not translateX like ui/progress) so the
 * bar grows from the right in Arabic too. Amber when 3 or fewer spots are left, red when full.
 */
export function CapacityBar({
  booked,
  capacity,
  className,
}: {
  booked: number;
  capacity: number;
  className?: string;
}) {
  const t = useTranslations("TrainerPortal");
  const f = useFormat();
  const left = capacity - booked;
  const percent = capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;
  const tone = left <= 0 ? "bg-destructive" : left <= 3 ? "bg-warning" : "bg-primary";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Users className="size-3.5" aria-hidden />
          {t("bookedOf", { booked: f.number(booked), capacity: f.number(capacity) })}
        </span>
        {left <= 0 && <span className="font-medium text-destructive">{t("full")}</span>}
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={t("capacityLabel")}
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={booked}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", tone)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/**
 * One class as a tappable card: time, state, category, description and bookings.
 * The whole card links to the roster page.
 */
export function ClassCard({
  session,
  now,
  showDay = false,
}: {
  session: SessionResponse;
  now: Date | null;
  /** Also show the day (for lists that aren't already grouped by day). */
  showDay?: boolean;
}) {
  const t = useTranslations("TrainerPortal");
  const f = useFormat();
  const state = liveState(session, now);

  return (
    <Link
      href={`/trainer/classes/${session.id}`}
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        state === "Cancelled" && "opacity-75",
        state === "Ongoing" && "border-success/40",
      )}
    >
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          <span className="flex items-center gap-1.5 font-semibold">
            <Clock className="size-4 text-muted-foreground" aria-hidden />
            {showDay && <span>{f.day(session.startDate)} ·</span>}
            <TimeRange start={session.startDate} end={session.endDate} />
          </span>
          {state !== "Upcoming" && <ClassStateBadge state={state} />}
          <Badge variant="secondary">{session.categoryName}</Badge>
        </div>
        <p className="truncate font-medium">{session.description}</p>
        {state === "Cancelled" ? (
          session.cancelReason && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {t("cancelReason", { reason: session.cancelReason })}
            </p>
          )
        ) : (
          <CapacityBar booked={session.bookedCount} capacity={session.capacity} />
        )}
      </div>
      <ChevronRight
        className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}
