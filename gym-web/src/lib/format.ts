/** The gym is in Cairo: every date/time shown to users uses this zone (the API stores UTC). */
export const GYM_TIME_ZONE = "Africa/Cairo";

/**
 * The Intl locale for each site language. Arabic keeps Western digits (1, 2, 3) so prices,
 * phone numbers and codes look the same in both languages, as most Egyptian sites do.
 * Every formatter below takes the site language as its last argument (English by default).
 */
export function intlLocale(locale: string = "en"): string {
  return locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB";
}

/** Formats money in Egyptian pounds, e.g. 1200 -> "EGP 1,200" (Arabic: "1,200 ج.م."). */
export function formatMoney(amount: number, locale?: string): string {
  return new Intl.NumberFormat(locale === "ar" ? intlLocale("ar") : "en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Formats a plain number with thousands separators, e.g. 1250 -> "1,250". */
export function formatNumber(value: number, locale?: string): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}

/**
 * Turns a plan length into words: 30 -> "1 month", 90 -> "3 months", 365 -> "1 year", 10 -> "10 days".
 * @deprecated English only: use useFormat().duration(days), which follows the site language.
 */
export function formatDuration(days: number): string {
  if (days === 365) return "1 year";
  if (days % 30 === 0) {
    const months = days / 30;
    return months === 1 ? "1 month" : `${months} months`;
  }
  return days === 1 ? "1 day" : `${days} days`;
}

/** Price per 30 days, used to compare plans of different lengths. */
export function monthlyPrice(price: number, days: number): number {
  return Math.round((price / days) * 30);
}

/**
 * A day count with the right word: 1 -> "1 day", 5 -> "5 days".
 * @deprecated English only: use useFormat().days(count), which follows the site language.
 */
export function formatDays(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

/** Formats a UTC date from the API as a Cairo date, e.g. "7 Oct 2026". */
export function formatDate(utc: string | Date, locale?: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: GYM_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(utc));
}

/** Formats a UTC date/time from the API as Cairo time, e.g. "7 Oct 2026, 18:00". */
export function formatDateTime(utc: string | Date, locale?: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: GYM_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(utc));
}

/** Formats a class start for schedules, in Cairo time, e.g. "Thu 8 Oct · 19:00". */
export function formatClassTime(utc: string | Date, locale?: string): string {
  return `${formatDay(utc, locale)} · ${formatTime(utc, locale)}`;
}

/** Formats a short day, in Cairo, e.g. "Thu 8 Oct". */
export function formatDay(utc: string | Date, locale?: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: GYM_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(utc));
}

/** Day and short month, in Cairo, e.g. "8 Oct" / "8 أكتوبر". */
export function formatDayMonth(utc: string | Date, locale?: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: GYM_TIME_ZONE,
    day: "numeric",
    month: "short",
  }).format(new Date(utc));
}

/** The short weekday name, in Cairo, e.g. "Thu" / "الخميس". */
export function formatWeekday(utc: string | Date, locale?: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: GYM_TIME_ZONE,
    weekday: "short",
  }).format(new Date(utc));
}

/** Formats a long day, in Cairo, e.g. "Thursday 8 October". */
export function formatLongDay(utc: string | Date, locale?: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: GYM_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(utc));
}

/** Formats only the time, in Cairo, e.g. "18:00". */
export function formatTime(utc: string | Date, locale?: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: GYM_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(utc));
}

/** The Cairo calendar day of a UTC time, as "YYYY-MM-DD" (handy for grouping by day). */
export function cairoDayKey(utc: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: GYM_TIME_ZONE }).format(new Date(utc));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from now until a date (rounded up), never below 0. */
export function daysUntil(utc: string | Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((new Date(utc).getTime() - now.getTime()) / DAY_MS));
}

/** The part of the day in Cairo, used to pick the right greeting. Browser only (uses the clock). */
export function dayPart(now: Date = new Date()): "morning" | "afternoon" | "evening" {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: GYM_TIME_ZONE,
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

/**
 * "Good morning" / "Good afternoon" / "Good evening", by the time in Cairo. Browser only (uses the clock).
 * @deprecated English only: use useFormat().greeting(now), which follows the site language.
 */
export function greeting(now: Date = new Date()): string {
  const part = dayPart(now);
  return part === "morning"
    ? "Good morning"
    : part === "afternoon"
      ? "Good afternoon"
      : "Good evening";
}

/** "Fady Kaiser" -> "Fady" */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0];
}

/** "Fady Kaiser" -> "FK", "Fady" -> "FA" (for avatars). */
export function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}
