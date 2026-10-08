import type { useTranslations } from "next-intl";
import { z } from "zod";
import {
  addressFields,
  ageOn,
  BLOOD_TYPES,
  EMAIL_MAX,
  GENDERS,
  healthFields,
  isAddressEmpty,
  isHealthEmpty,
  MAX_AGE,
  NAME_MAX,
  NAME_MIN,
  NAME_PATTERN,
  PHONE_PATTERN,
} from "@/lib/validation";

export type MemberErrorText = ReturnType<typeof useTranslations<"Members.errors">>;

// Same limits as CreateMemberRequestValidator / AddressDtoValidator / HealthRecordDtoValidator in
// the API (and lib/validation.ts). Written here again only so the messages are in the UI language.
const MIN_AGE = 12;
const DECIMAL = /^\d+(\.\d{1,2})?$/;
export const NOTE_MAX = 500;

/** Name, email, phone, date of birth and gender: required for every member (12+ years old). */
function personalFields(t: MemberErrorText) {
  const nameLength = t("nameLength", { min: NAME_MIN, max: NAME_MAX });
  return {
    name: z
      .string()
      .trim()
      .min(NAME_MIN, nameLength)
      .max(NAME_MAX, nameLength)
      .regex(NAME_PATTERN, t("nameChars")),
    email: z
      .string()
      .trim()
      .min(1, t("emailRequired"))
      .max(EMAIL_MAX, t("emailMax", { max: EMAIL_MAX }))
      .pipe(z.email(t("email"))),
    phone: z.string().trim().regex(PHONE_PATTERN, t("phone")),
    dateOfBirth: z
      .string()
      .min(1, t("dobRequired"))
      // The clock is read while checking (on submit), not while rendering.
      .refine((v) => ageOn(new Date(), v) >= MIN_AGE, t("dobMinAge", { min: MIN_AGE }))
      .refine((v) => ageOn(new Date(), v) < MAX_AGE, t("dobInvalid")),
    gender: z.enum(GENDERS, t("gender")),
  };
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

function addressRules(t: MemberErrorText) {
  return z.object({
    buildingNumber: z
      .string()
      .trim()
      .regex(/^\d{1,4}$/, t("buildingNumber"))
      .refine((v) => Number(v) >= 1, t("buildingNumber")),
    street: z.string().trim().min(2, t("street")).max(50, t("street")),
    city: z.string().trim().min(2, t("city")).max(30, t("city")),
  });
}

function healthRules(t: MemberErrorText) {
  return z.object({
    height: decimal(t("heightRequired"), t("heightFormat"), t("heightRange"), 50, 250),
    weight: decimal(t("weightRequired"), t("weightFormat"), t("weightRange"), 20, 300),
    bloodType: z
      .string()
      .refine((v) => (BLOOD_TYPES as readonly string[]).includes(v), t("bloodType")),
    note: z.string().max(NOTE_MAX, t("noteMax", { max: NOTE_MAX })),
  });
}

/**
 * Runs the strict rules of an "all or nothing" section (address / health) when `run` is true,
 * and reports each problem under its own box, e.g. "address.city". Use inside superRefine.
 */
function checkSection(
  ctx: z.RefinementCtx,
  section: "address" | "healthRecord",
  values: unknown,
  rules: z.ZodType,
  run: boolean,
) {
  if (!run) return;
  const result = rules.safeParse(values);
  if (result.success) return;
  for (const issue of result.error.issues) {
    ctx.addIssue({ code: "custom", message: issue.message, path: [section, ...issue.path] });
  }
}

/**
 * The add-member wizard: personal data is required, address and health are optional (left
 * empty = skipped). Pass the "Members.errors" translator so the messages are in the UI language.
 */
export function createMemberSchema(t: MemberErrorText) {
  const address = addressRules(t);
  const health = healthRules(t);
  return z
    .object({ ...personalFields(t), address: addressFields, healthRecord: healthFields })
    .superRefine((values, ctx) => {
      checkSection(ctx, "address", values.address, address, !isAddressEmpty(values.address));
      checkSection(
        ctx,
        "healthRecord",
        values.healthRecord,
        health,
        !isHealthEmpty(values.healthRecord),
      );
    });
}
export type CreateMemberValues = z.infer<ReturnType<typeof createMemberSchema>>;

/** Editing a member (health has its own form). */
export function editMemberSchema(t: MemberErrorText) {
  const address = addressRules(t);
  return z
    .object({ ...personalFields(t), address: addressFields })
    .superRefine((values, ctx) =>
      checkSection(ctx, "address", values.address, address, !isAddressEmpty(values.address)),
    );
}
export type EditMemberValues = z.infer<ReturnType<typeof editMemberSchema>>;

/** The health record form on the member's page: here the section is the whole point, so it's required. */
export function healthRecordSchema(t: MemberErrorText) {
  const health = healthRules(t);
  return z
    .object({ healthRecord: healthFields })
    .superRefine((values, ctx) =>
      checkSection(ctx, "healthRecord", values.healthRecord, health, true),
    );
}
export type HealthRecordValues = z.infer<ReturnType<typeof healthRecordSchema>>;

/** Photo rules, same as the API: JPG, PNG or WEBP up to 2 MB. Checked before uploading. */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

/** An error message for a picked file (in the UI language), or null when it's fine. */
export function photoProblem(file: File, t: MemberErrorText): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return t("photoType");
  if (file.size > PHOTO_MAX_BYTES) return t("photoSize");
  return null;
}
