import type { useTranslations } from "next-intl";
import { z } from "zod";
import { addressFields, validationRules, type ValidationText } from "@/lib/validation";

type ErrorText = ReturnType<typeof useTranslations<"Trainers.errors">>;

/** Trainers must be at least 18 (SaveTrainerRequestValidator). */
export const TRAINER_MIN_AGE = 18;

/**
 * The trainer form rules, with messages in the current language. Pass the "Trainers.errors"
 * and "Validation" translators. Same rules as SaveTrainerRequestValidator.
 */
export function trainerSchema(t: ErrorText, tValidation: ValidationText) {
  const rules = validationRules(tValidation);
  return z
    .object({
      name: rules.personName,
      email: rules.emailAddress,
      phone: rules.egyptianPhone,
      dateOfBirth: rules.dateOfBirth(TRAINER_MIN_AGE),
      gender: rules.gender,
      // The <Select> gives the id as a string; it's turned into a number when sending.
      categoryId: z.string().min(1, t("category")),
      // Optional: leave every box empty to skip it, or fill all three.
      address: addressFields,
    })
    .superRefine((values, ctx) => rules.checkOptionalSection(ctx, "address", values.address));
}

export type TrainerValues = z.infer<ReturnType<typeof trainerSchema>>;
