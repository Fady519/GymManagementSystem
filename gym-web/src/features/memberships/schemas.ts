import type { useTranslations } from "next-intl";
import { z } from "zod";

export type MembershipErrorText = ReturnType<typeof useTranslations<"Memberships.errors">>;

/** Same numbers as MembershipRulesOptions.cs (appsettings "MembershipRules"). The API checks them too. */
export const FREEZE_RULES = {
  minDays: 3,
  maxDays: 30,
  /** All freezes of one membership together. */
  maxTotalDays: 30,
} as const;

const NOTES_MAX = 500;
const REASON_MAX = 200;
const PAYMENT_METHODS = ["Cash", "Card", "InstaPay", "Online"] as const;

/** How they paid + an optional note: the same in the sell and renew forms. */
function paymentFields(t: MembershipErrorText) {
  return {
    paymentMethod: z.enum(PAYMENT_METHODS, t("paymentMethod")),
    notes: z
      .string()
      .trim()
      .max(NOTES_MAX, t("notesMax", { max: NOTES_MAX })),
  };
}

const reason = (t: MembershipErrorText) =>
  z
    .string()
    .trim()
    .max(REASON_MAX, t("reasonMax", { max: REASON_MAX }));

/**
 * Mirrors CreateMembershipRequestValidator.cs. Pass the "Memberships.errors" translator so the
 * messages are in the UI language.
 */
export function sellSchema(t: MembershipErrorText) {
  return z.object({
    memberId: z
      .number({ error: t("member") })
      .int()
      .positive(t("member")),
    planId: z.string().min(1, t("plan")),
    ...paymentFields(t),
  });
}
export type SellValues = z.infer<ReturnType<typeof sellSchema>>;

/** Mirrors RenewMembershipRequestValidator.cs */
export function renewSchema(t: MembershipErrorText) {
  return z.object({
    planId: z.string().min(1, t("plan")),
    ...paymentFields(t),
  });
}
export type RenewValues = z.infer<ReturnType<typeof renewSchema>>;

/** Days left in the freeze allowance of a membership. */
export function freezeAllowance(totalFrozenDays: number): number {
  return Math.max(0, FREEZE_RULES.maxTotalDays - totalFrozenDays);
}

/** Mirrors FreezeMembershipRequestValidator.cs, limited by what's left of the allowance. */
export function freezeSchema(t: MembershipErrorText, maxDays: number) {
  const range = t("daysRange", { min: FREEZE_RULES.minDays, max: maxDays });
  return z.object({
    days: z
      .string()
      .trim()
      .min(1, t("daysRequired"))
      .refine((v) => /^\d+$/.test(v), t("daysWhole"))
      .refine((v) => Number(v) >= FREEZE_RULES.minDays && Number(v) <= maxDays, range),
    reason: reason(t),
  });
}
export type FreezeValues = z.infer<ReturnType<typeof freezeSchema>>;

/**
 * Mirrors CancelMembershipRequestValidator.cs: a refund needs a method and can't be more than
 * was paid. `paidText` is the paid amount already formatted for the message (e.g. "EGP 1,200").
 */
export function cancelMembershipSchema(
  t: MembershipErrorText,
  pricePaid: number,
  paidText: string,
) {
  return z
    .object({
      refundAmount: z
        .string()
        .trim()
        .refine((v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v), t("refundFormat"))
        .refine(
          (v) => v === "" || Number(v) <= pricePaid,
          t("refundTooHigh", { amount: paidText }),
        ),
      refundMethod: z.string(),
      reason: reason(t),
    })
    .superRefine((values, ctx) => {
      if (Number(values.refundAmount) > 0 && !values.refundMethod) {
        ctx.addIssue({ code: "custom", path: ["refundMethod"], message: t("refundMethod") });
      }
    });
}
export type CancelMembershipValues = z.infer<ReturnType<typeof cancelMembershipSchema>>;
