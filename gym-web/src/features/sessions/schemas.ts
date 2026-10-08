import { z } from "zod";
import { cairoToUtc } from "@/lib/cairo-time";
import { wholeNumber } from "@/lib/validation";

/** Same numbers as SessionRulesOptions.cs (appsettings "SessionRules"). The API checks them too. */
export const SESSION_RULES = {
  maxCapacity: 25,
  minMinutes: 30,
  maxMinutes: 240,
} as const;

/** Length of a class in minutes from two "HH:mm" times on the same day (negative if end < start). */
export function minutesBetween(start: string, end: string): number {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return toMinutes(end) - toMinutes(start);
}

/** 90 -> "1 h 30 min", 60 -> "1 hour", 45 -> "45 min" */
export function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return hours === 1 ? "1 hour" : `${hours} hours`;
  return `${hours} h ${minutes} min`;
}

/**
 * The class form. The admin types Cairo date + times (classes never cross midnight), and we
 * convert to UTC only when sending. Mirrors SaveSessionRequestValidator.cs.
 */
export const sessionSchema = z
  .object({
    categoryId: z.string().min(1, "Choose the class type."),
    trainerId: z.string().min(1, "Choose the coach."),
    description: z
      .string()
      .trim()
      .min(2, "Describe the class in at least 2 characters.")
      .max(500, "The description can be at most 500 characters."),
    date: z.string().min(1, "Pick the day."),
    startTime: z.string().min(1, "Pick the start time."),
    endTime: z.string().min(1, "Pick the end time."),
    capacity: wholeNumber("capacity", 1, SESSION_RULES.maxCapacity),
  })
  .superRefine((values, ctx) => {
    if (!values.date || !values.startTime || !values.endTime) return;

    if (new Date(cairoToUtc(values.date, values.startTime)).getTime() <= Date.now()) {
      ctx.addIssue({
        code: "custom",
        path: ["startTime"],
        message: "The class must start in the future.",
      });
    }

    const minutes = minutesBetween(values.startTime, values.endTime);
    if (minutes <= 0) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "End after the start time." });
    } else if (minutes < SESSION_RULES.minMinutes || minutes > SESSION_RULES.maxMinutes) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: `A class lasts between ${SESSION_RULES.minMinutes} minutes and ${SESSION_RULES.maxMinutes / 60} hours.`,
      });
    }
  });

export type SessionValues = z.infer<typeof sessionSchema>;

/** Same rule as CancelSessionRequestValidator.cs: every booked member gets this by email. */
export const cancelReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Tell members why, in at least 3 characters.")
    .max(200, "Keep the reason under 200 characters."),
});

export type CancelReasonValues = z.infer<typeof cancelReasonSchema>;
