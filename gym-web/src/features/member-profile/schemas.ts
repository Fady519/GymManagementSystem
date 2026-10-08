import type { useTranslations } from "next-intl";
import { z } from "zod";
import { PHOTO_MAX_BYTES, PHOTO_TYPES } from "@/features/members/schemas";
import {
  addressFields,
  addressToFields,
  BLOOD_TYPES,
  healthFields,
  isAddressEmpty,
  PHONE_PATTERN,
  type HealthFields,
} from "@/lib/validation";
import type { HealthRecordDto, MemberResponse } from "@/types";

export type ErrorText = ReturnType<typeof useTranslations<"MemberProfile.errors">>;

// Same limits as the API (AddressDtoValidator / HealthRecordDtoValidator), and as lib/validation.ts.
// They are written again here only because these messages must be in the visitor's language.
const DECIMAL = /^\d+(\.\d{1,2})?$/;
export const NOTE_MAX = 500;

/**
 * Phone + optional address, with messages in the current language (pass "MemberProfile.errors").
 * The address is "all or nothing": empty boxes mean "no address", otherwise every box is checked.
 */
export function contactSchema(t: ErrorText) {
  const addressRules = z.object({
    buildingNumber: z
      .string()
      .trim()
      .regex(/^\d{1,4}$/, t("buildingNumber"))
      .refine((v) => Number(v) >= 1, t("buildingNumber")),
    street: z.string().trim().min(2, t("street")).max(50, t("street")),
    city: z.string().trim().min(2, t("city")).max(30, t("city")),
  });

  return z
    .object({
      phone: z.string().trim().regex(PHONE_PATTERN, t("phone")),
      address: addressFields,
    })
    .superRefine((values, ctx) => {
      if (isAddressEmpty(values.address)) return;
      const result = addressRules.safeParse(values.address);
      if (result.success) return;
      // Report each problem under its own box, e.g. "address.city".
      for (const issue of result.error.issues) {
        ctx.addIssue({ code: "custom", message: issue.message, path: ["address", ...issue.path] });
      }
    });
}

export type ContactValues = z.infer<ReturnType<typeof contactSchema>>;

export function toContactValues(profile: MemberResponse): ContactValues {
  return { phone: profile.phone, address: addressToFields(profile.address) };
}

/** A required decimal typed in a text box (inputs give strings), e.g. height "175.5". */
function decimal(required: string, format: string, range: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .min(1, required)
    .refine((v) => DECIMAL.test(v), format)
    .refine((v) => Number(v) >= min && Number(v) <= max, range);
}

/** The health form: here the record is the whole point of the form, so every box but the note is required. */
export function healthSchema(t: ErrorText) {
  return healthFields.extend({
    height: decimal(t("heightRequired"), t("heightFormat"), t("heightRange"), 50, 250),
    weight: decimal(t("weightRequired"), t("weightFormat"), t("weightRange"), 20, 300),
    // A plain string (not z.enum) so the empty "nothing selected yet" value fits the form type.
    bloodType: z
      .string()
      .refine((v) => (BLOOD_TYPES as readonly string[]).includes(v), t("bloodType")),
    note: z.string().max(NOTE_MAX, t("noteMax")),
  });
}

export type HealthValues = HealthFields;

/** The API body from the health form values (numbers as numbers, an empty note as null). */
export function toHealthRequest(values: HealthValues): HealthRecordDto {
  return {
    height: Number(values.height),
    weight: Number(values.weight),
    bloodType: values.bloodType,
    note: values.note.trim() || null,
  };
}

/** Same photo rules as the API (checked again there by reading the file's bytes). */
export function photoProblem(file: File, t: ErrorText): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return t("photoType");
  if (file.size > PHOTO_MAX_BYTES) return t("photoSize");
  return null;
}

export { PHOTO_TYPES };
