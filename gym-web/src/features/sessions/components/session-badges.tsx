"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { useFormat } from "@/hooks/use-format";
import { cn } from "@/lib/utils";
import type { BookingStatus, SessionState } from "@/types";

/**
 * Colors shared by the badge, the calendar blocks and the list, so a state looks the same
 * everywhere. The words come from the "Enums.SessionState" messages.
 */
export const SESSION_STATE_STYLE: Record<SessionState, { badge: string; block: string }> = {
  Upcoming: {
    badge: "border-primary/30 bg-primary/10 text-primary",
    block: "border-s-primary bg-primary/10 hover:bg-primary/15",
  },
  Ongoing: {
    badge: "border-success/30 bg-success/15 text-success",
    block: "border-s-success bg-success/15 hover:bg-success/20",
  },
  Completed: {
    badge: "border-border bg-muted text-muted-foreground",
    block: "border-s-muted-foreground/50 bg-muted hover:bg-muted/80",
  },
  Cancelled: {
    badge: "border-destructive/30 bg-destructive/10 text-destructive",
    block: "border-s-destructive bg-destructive/5 hover:bg-destructive/10 opacity-75",
  },
};

export function SessionStateBadge({
  state,
  className,
}: {
  state: SessionState;
  className?: string;
}) {
  const t = useTranslations("Enums.SessionState");
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

const BOOKING_STYLE: Record<BookingStatus, string> = {
  Booked: "border-primary/30 bg-primary/10 text-primary",
  Attended: "border-success/30 bg-success/15 text-success",
  Cancelled: "border-border bg-muted text-muted-foreground line-through",
};

/**
 * `classEnded`: a booking still "Booked" after its class finished means the member never
 * checked in, so it reads "No-show" instead.
 */
export function BookingStatusBadge({
  status,
  classEnded = false,
}: {
  status: BookingStatus;
  classEnded?: boolean;
}) {
  const tStatus = useTranslations("Enums.BookingStatus");
  const t = useTranslations("Sessions");
  if (status === "Booked" && classEnded) {
    return (
      <Badge
        variant="outline"
        className="border-warning/40 bg-warning/10 text-amber-700 dark:text-warning"
      >
        {t("bookingMissed")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={BOOKING_STYLE[status]}>
      {tStatus(status)}
    </Badge>
  );
}

/**
 * "7 / 10" with a thin bar. Turns amber when 3 or fewer spots are left and red when full,
 * so the reception sees at a glance which classes still have room. The bar uses a width
 * (not translateX), so it grows from the right in Arabic too.
 */
export function CapacityMeter({
  booked,
  capacity,
  className,
  showLabel = true,
}: {
  booked: number;
  capacity: number;
  className?: string;
  showLabel?: boolean;
}) {
  const tCommon = useTranslations("Common");
  const tPortal = useTranslations("TrainerPortal");
  const f = useFormat();
  const left = capacity - booked;
  const percent = capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;
  const tone = left <= 0 ? "bg-destructive" : left <= 3 ? "bg-warning" : "bg-primary";

  return (
    <div className={cn("min-w-28 space-y-1", className)}>
      {showLabel && (
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="font-medium tabular-nums" dir="ltr">
            {f.number(booked)} / {f.number(capacity)}
          </span>
          <span
            className={cn(
              "text-muted-foreground",
              left <= 0 && "font-medium text-destructive",
              left > 0 && left <= 3 && "font-medium text-amber-700 dark:text-warning",
            )}
          >
            {tCommon("spotsLeft", { count: Math.max(0, left) })}
          </span>
        </div>
      )}
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={tPortal("capacityLabel")}
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
