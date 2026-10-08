import type { useTranslations } from "next-intl";
import { z } from "zod";
import { cairoToUtc } from "@/lib/cairo-time";
import { validationRules, type ValidationText } from "@/lib/validation";

type ErrorText = ReturnType<typeof useTranslations<"Sessions.errors">>;
type LengthText = ReturnType<typeof useTranslations<"Sessions.length">>;

/** Same numbers as SessionRulesOptions.cs (appsettings "SessionRules"). The API checks them too. */
export const SESSION_RULES = {
  maxCapacity: 25,
  minMinutes: 30,
  maxMinutes: 240,
} as const;

// Same limits as SaveSessionRequestValidator.cs / CancelSessionRequestValidator.cs.
export const DESCRIPTION_MIN = 2;
export const DESCRIPTION_MAX = 500;
export const REASON_MIN = 3;
export const REASON_MAX = 200;

/** Length of a class in minutes from two "HH:mm" times on the same day (negative if end < start). */
export function minutesBetween(start: string, end: string): number {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return toMinutes(end) - toMinutes(start);
}

/**
 * A class length in words, in the current language (pass the "Sessions.length" translator):
 * 90 -> "1 h 30 min", 60 -> "1 hour", 45 -> "45 min".
 */
export function formatMinutes(total: number, t: LengthText): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return t("minutes", { count: minutes });
  if (minutes === 0) return t("hours", { count: hours });
  return t("hoursMinutes", { hours, minutes });
}

/**
 * The class form, with messages in the current language (pass the "Sessions.errors" and
 * "Validation" translators).
 * The admin types Cairo date + times (classes never cross midnight), and we convert to UTC only
 * when sending. Mirrors SaveSessionRequestValidator.cs.
 */
export function sessionSchema(t: ErrorText, tValidation: ValidationText) {
  const { maxCapacity, minMinutes, maxMinutes } = SESSION_RULES;
  const rules = validationRules(tValidation);
  return z
    .object({
      categoryId: z.string().min(1, t("category")),
      trainerId: z.string().min(1, t("trainer")),
      description: z
        .string()
        .trim()
        .min(DESCRIPTION_MIN, t("descriptionMin", { min: DESCRIPTION_MIN }))
        .max(DESCRIPTION_MAX, t("descriptionMax", { max: DESCRIPTION_MAX })),
      date: z.string().min(1, t("date")),
      startTime: z.string().min(1, t("startTime")),
      endTime: z.string().min(1, t("endTime")),
      // The box gives a string; it becomes a number when sending.
      capacity: rules.wholeNumber(1, maxCapacity),
    })
    .superRefine((values, ctx) => {
      if (!values.date || !values.startTime || !values.endTime) return;

      if (new Date(cairoToUtc(values.date, values.startTime)).getTime() <= Date.now()) {
        ctx.addIssue({ code: "custom", path: ["startTime"], message: t("future") });
      }

      const minutes = minutesBetween(values.startTime, values.endTime);
      if (minutes <= 0) {
        ctx.addIssue({ code: "custom", path: ["endTime"], message: t("endAfterStart") });
      } else if (minutes < minMinutes || minutes > maxMinutes) {
        ctx.addIssue({
          code: "custom",
          path: ["endTime"],
          message: t("length", { min: minMinutes, max: maxMinutes / 60 }),
        });
      }
    });
}

export type SessionValues = z.infer<ReturnType<typeof sessionSchema>>;

/** Same rule as CancelSessionRequestValidator.cs: every booked member gets this by email. */
export function cancelReasonSchema(t: ErrorText) {
  return z.object({
    reason: z
      .string()
      .trim()
      .min(REASON_MIN, t("reasonMin", { min: REASON_MIN }))
      .max(REASON_MAX, t("reasonMax", { max: REASON_MAX })),
  });
}

export type CancelReasonValues = z.infer<ReturnType<typeof cancelReasonSchema>>;
