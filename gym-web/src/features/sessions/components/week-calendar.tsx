"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SESSION_STATE_STYLE,
  SessionStateBadge,
} from "@/features/sessions/components/session-badges";
import {
  addDays,
  cairoMinuteOfDay,
  cairoToUtc,
  cairoToday,
  formatPlainDay,
  formatWeekday,
  utcToCairoInputs,
} from "@/lib/cairo-time";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SessionResponse } from "@/types";

/** Height of one hour on the grid, in pixels. */
const HOUR_PX = 60;
/** The grid shows at least 06:00–23:00; it grows if a class is earlier or later. */
const DEFAULT_FIRST_HOUR = 6;
const DEFAULT_LAST_HOUR = 23;

type PlacedSession = {
  session: SessionResponse;
  startMin: number;
  endMin: number;
  /** Side-by-side position when classes overlap (different coaches at the same time). */
  lane: number;
  lanes: number;
};

/**
 * Puts overlapping classes side by side, like Google Calendar: classes that overlap form a
 * group, each class takes the first free column in its group, and the group is split into
 * as many columns as it needs.
 */
function placeDay(sessions: SessionResponse[]): PlacedSession[] {
  const items = sessions
    .map((session) => {
      const startMin = cairoMinuteOfDay(session.startDate);
      const length =
        (new Date(session.endDate).getTime() - new Date(session.startDate).getTime()) / 60_000;
      return { session, startMin, endMin: startMin + length, lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const placed: PlacedSession[] = [];
  let group: PlacedSession[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -1;

  const closeGroup = () => {
    for (const item of group) item.lanes = laneEnds.length;
    placed.push(...group);
    group = [];
    laneEnds = [];
  };

  for (const item of items) {
    if (item.startMin >= groupEnd && group.length > 0) closeGroup();
    let lane = laneEnds.findIndex((end) => end <= item.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endMin);
    } else {
      laneEnds[lane] = item.endMin;
    }
    item.lane = lane;
    group.push(item);
    groupEnd = Math.max(groupEnd, item.endMin);
  }
  if (group.length > 0) closeGroup();
  return placed;
}

/** The current time, updated every minute (drives the red "now" line and which slots are past). */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

type WeekCalendarProps = {
  /** The Saturday that starts the week, "YYYY-MM-DD". */
  weekStart: string;
  sessions: SessionResponse[] | undefined;
  isPending: boolean;
  onSessionClick: (session: SessionResponse) => void;
  /** Click on an empty future slot: schedule a class there. */
  onSlotClick: (date: string, time: string) => void;
};

export function WeekCalendar({
  weekStart,
  sessions,
  isPending,
  onSessionClick,
  onSlotClick,
}: WeekCalendarProps) {
  const now = useNow();
  const today = cairoToday(now);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // Group the week's classes by their Cairo day.
  const byDay = useMemo(() => {
    const map = new Map<string, SessionResponse[]>(days.map((d) => [d, []]));
    for (const session of sessions ?? []) {
      map.get(utcToCairoInputs(session.startDate).date)?.push(session);
    }
    return map;
  }, [days, sessions]);

  const placedByDay = useMemo(
    () => new Map(days.map((d) => [d, placeDay(byDay.get(d) ?? [])])),
    [days, byDay],
  );

  // Grow the visible hours to fit every class.
  const { firstHour, lastHour } = useMemo(() => {
    let first = DEFAULT_FIRST_HOUR;
    let last = DEFAULT_LAST_HOUR;
    for (const list of placedByDay.values()) {
      for (const item of list) {
        first = Math.min(first, Math.floor(item.startMin / 60));
        last = Math.max(last, Math.ceil(item.endMin / 60));
      }
    }
    return { firstHour: first, lastHour: Math.min(24, last) };
  }, [placedByDay]);

  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);
  const gridHeight = hours.length * HOUR_PX;
  const nowMinute = cairoMinuteOfDay(now);

  return (
    <>
      {/* Desktop and tablet: the time grid. */}
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b bg-muted/30">
          <div />
          {days.map((day) => {
            const isToday = day === today;
            const count = byDay.get(day)?.filter((s) => s.state !== "Cancelled").length ?? 0;
            return (
              <div key={day} className="border-s px-2 py-2.5 text-center">
                <p
                  className={cn(
                    "text-xs font-medium uppercase",
                    isToday ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {formatWeekday(day)}
                </p>
                <p
                  className={cn(
                    "mx-auto mt-0.5 flex h-7 w-fit min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-semibold",
                    isToday && "bg-primary text-primary-foreground",
                  )}
                >
                  {formatPlainDay(day)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {count === 0 ? "No classes" : `${count} ${count === 1 ? "class" : "classes"}`}
                </p>
              </div>
            );
          })}
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          <div
            className="relative grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]"
            style={{ height: gridHeight }}
          >
            {/* Hour labels */}
            <div className="relative">
              {hours.map((hour, i) => (
                <span
                  key={hour}
                  className="absolute end-2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums"
                  style={{ top: i * HOUR_PX }}
                >
                  {i === 0 ? "" : `${String(hour).padStart(2, "0")}:00`}
                </span>
              ))}
            </div>

            {days.map((day) => {
              const isToday = day === today;
              return (
                <div key={day} className={cn("relative border-s", isToday && "bg-primary/[0.03]")}>
                  {/* One clickable cell per hour (empty future slots schedule a class there). */}
                  {hours.map((hour, i) => {
                    const time = `${String(hour).padStart(2, "0")}:00`;
                    const past = new Date(cairoToUtc(day, time)).getTime() <= now.getTime();
                    return (
                      <button
                        key={hour}
                        type="button"
                        disabled={past}
                        onClick={() => onSlotClick(day, time)}
                        aria-label={`Schedule a class on ${formatWeekday(day)} ${formatPlainDay(day)} at ${time}`}
                        className={cn(
                          "group absolute inset-x-0 flex items-start justify-end border-t border-dashed border-border/60 p-1",
                          past ? "cursor-default bg-muted/20" : "hover:bg-primary/5",
                        )}
                        style={{ top: i * HOUR_PX, height: HOUR_PX }}
                      >
                        {!past && (
                          <Plus className="size-3.5 text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                        )}
                      </button>
                    );
                  })}

                  {/* The red "now" line on today's column. */}
                  {isToday && nowMinute >= firstHour * 60 && nowMinute <= lastHour * 60 && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                      style={{ top: ((nowMinute - firstHour * 60) / 60) * HOUR_PX }}
                    >
                      <span className="-ms-1 size-2 rounded-full bg-destructive" />
                      <span className="h-px flex-1 bg-destructive" />
                    </div>
                  )}

                  {placedByDay.get(day)?.map(({ session, startMin, endMin, lane, lanes }) => {
                    const top = ((startMin - firstHour * 60) / 60) * HOUR_PX;
                    const height = Math.max(((endMin - startMin) / 60) * HOUR_PX - 2, 24);
                    const short = height < 52;
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => onSessionClick(session)}
                        title={`${session.categoryName} · ${session.trainerName} · ${formatTime(session.startDate)}–${formatTime(session.endDate)}`}
                        className={cn(
                          "absolute z-10 overflow-hidden rounded-md border-s-[3px] px-1.5 py-1 text-start text-[11px] leading-tight shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                          SESSION_STATE_STYLE[session.state].block,
                        )}
                        style={{
                          top: top + 1,
                          height,
                          insetInlineStart: `calc(${(lane / lanes) * 100}% + 2px)`,
                          width: `calc(${100 / lanes}% - 4px)`,
                        }}
                      >
                        <p
                          className={cn(
                            "truncate font-semibold",
                            session.state === "Cancelled" && "line-through",
                          )}
                        >
                          {session.categoryName}
                        </p>
                        {!short && (
                          <>
                            <p className="truncate text-muted-foreground tabular-nums">
                              {formatTime(session.startDate)}–{formatTime(session.endDate)}
                            </p>
                            <p className="truncate text-muted-foreground">{session.trainerName}</p>
                            {session.state !== "Cancelled" && (
                              <p className="truncate font-medium tabular-nums">
                                {session.bookedCount}/{session.capacity} booked
                              </p>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {isPending && (
              <div className="absolute inset-0 z-30 flex items-start justify-center bg-background/40 pt-24">
                <Skeleton className="h-6 w-40" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Phones: one list per day (a 7-column grid doesn't fit). */}
      <div className="space-y-4 md:hidden">
        {days.map((day) => {
          const list = [...(byDay.get(day) ?? [])].sort((a, b) =>
            a.startDate.localeCompare(b.startDate),
          );
          return (
            <section key={day}>
              <h3 className={cn("mb-2 text-sm font-semibold", day === today && "text-primary")}>
                {formatWeekday(day)} {formatPlainDay(day)}
                {day === today && " · Today"}
              </h3>
              {isPending ? (
                <Skeleton className="h-16 w-full rounded-lg" />
              ) : list.length === 0 ? (
                <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  No classes.
                </p>
              ) : (
                <div className="space-y-2">
                  {list.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => onSessionClick(session)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-lg border-s-[3px] p-3 text-start",
                        SESSION_STATE_STYLE[session.state].block,
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{session.categoryName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatTime(session.startDate)}–{formatTime(session.endDate)} ·{" "}
                          {session.trainerName}
                        </p>
                      </div>
                      <SessionStateBadge state={session.state} />
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
