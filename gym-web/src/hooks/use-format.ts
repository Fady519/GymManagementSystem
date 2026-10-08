import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  dayPart,
  formatClassTime,
  formatDate,
  formatDateTime,
  formatDay,
  formatDayMonth,
  formatLongDay,
  formatMoney,
  formatNumber,
  formatTime,
  formatWeekday,
} from "@/lib/format";

/**
 * The formatters from lib/format, already set to the current language, plus the ones that need
 * words ("3 months", "Good morning"). Works in client components and in non-async server components.
 *
 *   const f = useFormat();
 *   f.money(1200)    // "EGP 1,200"  |  "1,200 ج.م."
 *   f.duration(90)   // "3 months"   |  "3 أشهر"
 */
export function useFormat() {
  const locale = useLocale();
  const t = useTranslations("Format");

  return useMemo(
    () => ({
      locale,
      money: (amount: number) => formatMoney(amount, locale),
      number: (value: number) => formatNumber(value, locale),
      date: (utc: string | Date) => formatDate(utc, locale),
      dateTime: (utc: string | Date) => formatDateTime(utc, locale),
      day: (utc: string | Date) => formatDay(utc, locale),
      longDay: (utc: string | Date) => formatLongDay(utc, locale),
      weekday: (utc: string | Date) => formatWeekday(utc, locale),
      dayMonth: (utc: string | Date) => formatDayMonth(utc, locale),
      time: (utc: string | Date) => formatTime(utc, locale),
      classTime: (utc: string | Date) => formatClassTime(utc, locale),
      days: (count: number) => t("days", { count }),
      /** A plan length in words: 30 -> "1 month", 365 -> "1 year", 10 -> "10 days". */
      duration: (days: number) =>
        days === 365
          ? t("years", { count: 1 })
          : days % 30 === 0
            ? t("months", { count: days / 30 })
            : t("days", { count: days }),
      /** Browser only: uses the clock. */
      greeting: (now?: Date) => t(`greeting.${dayPart(now)}`),
    }),
    [locale, t],
  );
}
