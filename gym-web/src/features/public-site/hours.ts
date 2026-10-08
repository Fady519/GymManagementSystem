import { GYM_TIME_ZONE, intlLocale } from "@/lib/format";
import type { GymSettingsResponse } from "@/types";

/**
 * Opening-hours logic shared by the server (JSON-LD) and the browser ("Open now" badge).
 * The API sends times as "HH:mm:ss" in Cairo time:
 *   - weekday hours = Saturday to Thursday
 *   - Friday hours  = both null when the gym is closed on Friday
 */
export type DayHours = { opens: string; closes: string } | null;

type Hours = Pick<
  GymSettingsResponse,
  "weekdayOpensAt" | "weekdayClosesAt" | "fridayOpensAt" | "fridayClosesAt"
>;

const FRIDAY = 5; // JavaScript weekdays: 0 = Sunday ... 6 = Saturday

/** "06:00:00" -> "06:00" */
export function toHHmm(time: string): string {
  return time.slice(0, 5);
}

/** "06:30:00" -> 390 (minutes after midnight). */
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** The hours of one weekday, or null when the gym is closed that day. */
export function hoursOn(settings: Hours, weekday: number): DayHours {
  if (weekday === FRIDAY) {
    return settings.fridayOpensAt && settings.fridayClosesAt
      ? { opens: toHHmm(settings.fridayOpensAt), closes: toHHmm(settings.fridayClosesAt) }
      : null;
  }
  return { opens: toHHmm(settings.weekdayOpensAt), closes: toHHmm(settings.weekdayClosesAt) };
}

/** The weekday (0-6) and minutes after midnight right now in Cairo, whatever the visitor's time zone. */
export function cairoClock(now: Date = new Date()): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: GYM_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export type OpenState =
  | { open: true; closes: string }
  | { open: false; opens: string; when: "today" | "tomorrow" | "later"; weekday: number };

/** Is the gym open right now? If not, when does it open next? */
export function openState(settings: Hours, now: Date = new Date()): OpenState | null {
  const { weekday, minutes } = cairoClock(now);
  const today = hoursOn(settings, weekday);

  if (today && minutes >= toMinutes(today.opens) && minutes < toMinutes(today.closes)) {
    return { open: true, closes: today.closes };
  }
  if (today && minutes < toMinutes(today.opens)) {
    return { open: false, opens: today.opens, when: "today", weekday };
  }

  // Closed for the rest of today: look at the next 7 days for the next opening.
  for (let offset = 1; offset <= 7; offset++) {
    const day = (weekday + offset) % 7;
    const hours = hoursOn(settings, day);
    if (hours) {
      return {
        open: false,
        opens: hours.opens,
        when: offset === 1 ? "tomorrow" : "later",
        weekday: day,
      };
    }
  }
  return null;
}

/** The name of a weekday in the site language: 6 -> "Saturday" / "السبت". */
export function weekdayName(weekday: number, locale: string): string {
  // 4 January 2026 was a Sunday, so 4 + weekday lands on the right day.
  const date = new Date(Date.UTC(2026, 0, 4 + weekday, 12));
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", timeZone: "UTC" }).format(
    date,
  );
}
