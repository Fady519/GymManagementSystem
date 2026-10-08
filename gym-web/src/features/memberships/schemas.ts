import { z } from "zod";
import { wholeNumber } from "@/lib/validation";

/** Same numbers as MembershipRulesOptions.cs (appsettings "MembershipRules"). The API checks them too. */
export const FREEZE_RULES = {
  minDays: 3,
  maxDays: 30,
  /** All freezes of one membership together. */
  maxTotalDays: 30,
} as const;

const paymentMethod = z.enum(["Cash", "Card", "InstaPay", "Online"], "Choose how they paid.");
const notes = z.string().trim().max(500, "Notes can be at most 500 characters.");

/** Mirrors CreateMembershipRequestValidator.cs */
export const sellSchema = z.object({
  memberId: z.number({ error: "Choose the member." }).int().positive("Choose the member."),
  planId: z.string().min(1, "Choose a plan."),
  paymentMethod,
  notes,
});
export type SellValues = z.infer<typeof sellSchema>;

/** Mirrors RenewMembershipRequestValidator.cs */
export const renewSchema = z.object({
  planId: z.string().min(1, "Choose a plan."),
  paymentMethod,
  notes,
});
export type RenewValues = z.infer<typeof renewSchema>;

/** Days left in the freeze allowance of a membership. */
export function freezeAllowance(totalFrozenDays: number): number {
  return Math.max(0, FREEZE_RULES.maxTotalDays - totalFrozenDays);
}

/** Mirrors FreezeMembershipRequestValidator.cs, limited by what's left of the allowance. */
export function freezeSchema(maxDays: number) {
  return z.object({
    days: wholeNumber("number of days", FREEZE_RULES.minDays, maxDays),
    reason: z.string().trim().max(200, "Keep the reason under 200 characters."),
  });
}
export type FreezeValues = z.infer<ReturnType<typeof freezeSchema>>;

/** Mirrors CancelMembershipRequestValidator.cs: a refund needs a method and can't be more than was paid. */
export function cancelMembershipSchema(pricePaid: number) {
  return z
    .object({
      refundAmount: z
        .string()
        .trim()
        .refine(
          (v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v),
          "Enter the refund as a number, e.g. 500.",
        )
        .refine(
          (v) => v === "" || Number(v) <= pricePaid,
          `The refund can't be more than the ${pricePaid} EGP paid.`,
        ),
      refundMethod: z.string(),
      reason: z.string().trim().max(200, "Keep the reason under 200 characters."),
    })
    .superRefine((values, ctx) => {
      if (Number(values.refundAmount) > 0 && !values.refundMethod) {
        ctx.addIssue({
          code: "custom",
          path: ["refundMethod"],
          message: "Choose how the refund is paid back.",
        });
      }
    });
}
export type CancelMembershipValues = z.infer<ReturnType<typeof cancelMembershipSchema>>;
