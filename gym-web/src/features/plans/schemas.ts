import type { useTranslations } from "next-intl";
import { z } from "zod";
import { validationRules, type ValidationText } from "@/lib/validation";

type ErrorText = ReturnType<typeof useTranslations<"Plans.errors">>;

// Same limits as PlanValidators.cs (PlanRules).
export const PLAN_NAME_MIN = 2;
export const PLAN_NAME_MAX = 50;
export const PLAN_DESCRIPTION_MIN = 5;
export const PLAN_DESCRIPTION_MAX = 200;
export const PLAN_DAYS_MAX = 365;
export const PLAN_PRICE_MAX = 100_000;

/**
 * The plan form rules, with messages in the current language. Pass the "Plans.errors" and
 * "Validation" translators, and a money formatter (useFormat().money) for the price limit.
 * Values stay strings, as the inputs give them; they become numbers when sending.
 */
export function planSchema(
  t: ErrorText,
  tValidation: ValidationText,
  money: (amount: number) => string,
) {
  const rules = validationRules(tValidation);
  return z.object({
    name: z
      .string()
      .trim()
      .min(PLAN_NAME_MIN, t("nameMin", { min: PLAN_NAME_MIN }))
      .max(PLAN_NAME_MAX, t("nameMax", { max: PLAN_NAME_MAX })),
    description: z
      .string()
      .trim()
      .min(PLAN_DESCRIPTION_MIN, t("descriptionMin", { min: PLAN_DESCRIPTION_MIN }))
      .max(PLAN_DESCRIPTION_MAX, t("descriptionMax", { max: PLAN_DESCRIPTION_MAX })),
    durationDays: rules.wholeNumber(1, PLAN_DAYS_MAX),
    // EGP with at most 2 decimals, e.g. "1250" or "99.50".
    price: rules.money(PLAN_PRICE_MAX, money(PLAN_PRICE_MAX)),
  });
}

export type PlanValues = z.infer<ReturnType<typeof planSchema>>;
