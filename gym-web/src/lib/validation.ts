import type { useTranslations } from "next-intl";
import { z } from "zod";

/**
 * Form rules shared by many forms. They mirror the API validators (GymManagementBLL/Validators),
 * so most mistakes are caught before the request is sent. The API still checks everything:
 * these are for a fast, friendly form, not for security.
 *
 * The rules below with English messages are kept for older forms. New and translated forms use
 * validationRules(t) at the bottom of this file: the same rules, with messages in the visitor's language.
 */

/** The "Validation" messages, e.g. from useTranslations("Validation") or getTranslations("Validation"). */
export type ValidationText = ReturnType<typeof useTranslations<"Validation">>;

// Same numbers as CommonRules.cs
export const NAME_MIN = 2;
export const NAME_MAX = 50;
export const EMAIL_MAX = 100;
export const MAX_AGE = 100;

/** Letters of any language (\p{L}), spaces, dot, apostrophe and dash. */
export const NAME_PATTERN = /^[\p{L}\s.'-]+$/u;
/** Egyptian mobile: 010 / 011 / 012 / 015 + 8 digits. */
export const PHONE_PATTERN = /^01[0125][0-9]{8}$/;

/** Same list as HealthRecordDtoValidator.BloodTypes. */
export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const GENDERS = ["Male", "Female"] as const;

/** Age in whole years on today's date, from a "yyyy-mm-dd" string. */
export function ageOn(today: Date, isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  let age = today.getFullYear() - year;
  const birthdayPassed =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!birthdayPassed) age--;
  return age;
}

export const personName = z
  .string()
  .trim()
  .min(NAME_MIN, `Name must be at least ${NAME_MIN} characters.`)
  .max(NAME_MAX, `Name can be at most ${NAME_MAX} characters.`)
  .regex(NAME_PATTERN, "Name can only contain letters, spaces, dots, apostrophes and dashes.");

export const emailAddress = z
  .string()
  .trim()
  .min(1, "Enter an email address.")
  .max(EMAIL_MAX, `Email can be at most ${EMAIL_MAX} characters.`)
  .pipe(z.email("Enter a valid email address."));

export const egyptianPhone = z
  .string()
  .trim()
  .regex(PHONE_PATTERN, "Enter an Egyptian mobile number, e.g. 01012345678.");

export const gender = z.enum(GENDERS, "Select a gender.");

/** A "yyyy-mm-dd" date of birth for someone aged between minAge and 100. */
export function dateOfBirth(minAge: number) {
  return z
    .string()
    .min(1, "Enter the date of birth.")
    .refine((value) => ageOn(new Date(), value) >= minAge, `Must be at least ${minAge} years old.`)
    .refine((value) => ageOn(new Date(), value) < MAX_AGE, "Enter a valid date of birth.");
}

/** A required whole number typed in a text box (the box gives a string). */
export function wholeNumber(label: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .min(1, `Enter the ${label}.`)
    .refine((v) => /^\d+$/.test(v), `The ${label} must be a whole number.`)
    .refine((v) => Number(v) >= min && Number(v) <= max, `The ${label} must be ${min}–${max}.`);
}

/** A required amount of money in EGP with at most 2 decimals, e.g. "1250" or "99.50". */
export function money(label: string, max: number) {
  return z
    .string()
    .trim()
    .min(1, `Enter the ${label}.`)
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), `Enter the ${label} as a number, e.g. 1500.`)
    .refine((v) => Number(v) > 0, `The ${label} must be more than 0.`)
    .refine(
      (v) => Number(v) <= max,
      `The ${label} can be at most ${max.toLocaleString("en")} EGP.`,
    );
}

/** A required decimal number typed in a text box, e.g. height "175.5". */
function decimalNumber(label: string, unit: string, min: number, max: number, example: string) {
  return z
    .string()
    .trim()
    .min(1, `Enter the ${label}.`)
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), `Enter the ${label} as a number, e.g. ${example}.`)
    .refine(
      (v) => Number(v) >= min && Number(v) <= max,
      `The ${label} must be between ${min} and ${max} ${unit}.`,
    );
}

/**
 * Address and health record are optional on the API. In the forms they are "all or nothing":
 * leave every box empty to skip, or fill the required ones. Form values stay strings
 * (that's what inputs give us) and are converted to numbers only when sending.
 */
export const addressFields = z.object({
  buildingNumber: z.string(),
  street: z.string(),
  city: z.string(),
});
export type AddressFields = z.infer<typeof addressFields>;
export const EMPTY_ADDRESS: AddressFields = { buildingNumber: "", street: "", city: "" };

const addressRules = z.object({
  buildingNumber: wholeNumber("building number", 1, 9999),
  street: z.string().trim().min(2, "Enter the street (2–50 characters).").max(50),
  city: z.string().trim().min(2, "Enter the city (2–30 characters).").max(30),
});

export const healthFields = z.object({
  height: z.string(),
  weight: z.string(),
  bloodType: z.string(),
  note: z.string(),
});
export type HealthFields = z.infer<typeof healthFields>;
export const EMPTY_HEALTH: HealthFields = { height: "", weight: "", bloodType: "", note: "" };

const healthRules = z.object({
  height: decimalNumber("height", "cm", 50, 250, "175"),
  weight: decimalNumber("weight", "kg", 20, 300, "72.5"),
  bloodType: z.enum(BLOOD_TYPES, "Select the blood type."),
  note: z.string().max(500, "The note can be at most 500 characters."),
});

export function isAddressEmpty(a: AddressFields): boolean {
  return !a.buildingNumber.trim() && !a.street.trim() && !a.city.trim();
}

export function isHealthEmpty(h: HealthFields): boolean {
  return !h.height.trim() && !h.weight.trim() && !h.bloodType && !h.note.trim();
}

/**
 * Runs the strict rules on a section only when something in it was typed, and reports each
 * problem under its own field (e.g. "address.city"). Use inside a schema's superRefine.
 * With required = true the rules always run (a form whose whole point is that section).
 */
export function checkOptionalSection(
  ctx: z.RefinementCtx,
  section: "address" | "healthRecord",
  values: AddressFields | HealthFields,
  required = false,
) {
  const empty =
    section === "address"
      ? isAddressEmpty(values as AddressFields)
      : isHealthEmpty(values as HealthFields);
  if (empty && !required) return;

  const rules = section === "address" ? addressRules : healthRules;
  const result = rules.safeParse(values);
  if (result.success) return;

  for (const issue of result.error.issues) {
    ctx.addIssue({ code: "custom", message: issue.message, path: [section, ...issue.path] });
  }
}

/** The API shape of an address, or null when the section was left empty. */
export function toAddressDto(a: AddressFields) {
  return isAddressEmpty(a)
    ? null
    : { buildingNumber: Number(a.buildingNumber), street: a.street.trim(), city: a.city.trim() };
}

/** The API shape of a health record, or null when the section was left empty. */
export function toHealthDto(h: HealthFields) {
  return isHealthEmpty(h)
    ? null
    : {
        height: Number(h.height),
        weight: Number(h.weight),
        bloodType: h.bloodType,
        note: h.note.trim() || null,
      };
}

/** Form values from an API address (null becomes empty boxes). */
export function addressToFields(
  a: { buildingNumber: number; street: string; city: string } | null,
): AddressFields {
  return a
    ? { buildingNumber: String(a.buildingNumber), street: a.street, city: a.city }
    : EMPTY_ADDRESS;
}

/** Form values from an API health record (null becomes empty boxes). */
export function healthToFields(
  h: { height: number; weight: number; bloodType: string; note: string | null } | null,
): HealthFields {
  return h
    ? {
        height: String(h.height),
        weight: String(h.weight),
        bloodType: h.bloodType,
        note: h.note ?? "",
      }
    : EMPTY_HEALTH;
}

/**
 * The shared rules with messages in the visitor's language. Build them once per form:
 *
 *   const tValidation = useTranslations("Validation");
 *   const schema = useMemo(() => {
 *     const rules = validationRules(tValidation);
 *     return z.object({ name: rules.personName, phone: rules.egyptianPhone });
 *   }, [tValidation]);
 *
 * Messages don't repeat the field's label (it is shown right above the error), which also keeps
 * the Arabic grammar right.
 */
export function validationRules(t: ValidationText) {
  const wholeNumberRule = (min: number, max: number) =>
    z
      .string()
      .trim()
      .min(1, t("numberRequired"))
      .refine((v) => /^\d+$/.test(v), t("wholeNumber"))
      .refine((v) => Number(v) >= min && Number(v) <= max, t("numberRange", { min, max }));

  const decimalRule = (
    min: number,
    max: number,
    messages: { required: string; format: string; range: string },
  ) =>
    z
      .string()
      .trim()
      .min(1, messages.required)
      .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), messages.format)
      .refine((v) => Number(v) >= min && Number(v) <= max, messages.range);

  const addressRulesT = z.object({
    buildingNumber: z
      .string()
      .trim()
      .regex(/^\d{1,4}$/, t("buildingNumber"))
      .refine((v) => Number(v) >= 1, t("buildingNumber")),
    street: z.string().trim().min(2, t("street")).max(50, t("street")),
    city: z.string().trim().min(2, t("city")).max(30, t("city")),
  });

  const healthRulesT = z.object({
    height: decimalRule(50, 250, {
      required: t("heightRequired"),
      format: t("heightFormat"),
      range: t("heightRange"),
    }),
    weight: decimalRule(20, 300, {
      required: t("weightRequired"),
      format: t("weightFormat"),
      range: t("weightRange"),
    }),
    bloodType: z.enum(BLOOD_TYPES, t("bloodType")),
    note: z.string().max(500, t("noteMax")),
  });

  return {
    personName: z
      .string()
      .trim()
      .min(NAME_MIN, t("nameMin", { min: NAME_MIN }))
      .max(NAME_MAX, t("nameMax", { max: NAME_MAX }))
      .regex(NAME_PATTERN, t("namePattern")),

    emailAddress: z
      .string()
      .trim()
      .min(1, t("emailRequired"))
      .max(EMAIL_MAX, t("emailMax", { max: EMAIL_MAX }))
      .pipe(z.email(t("email"))),

    egyptianPhone: z.string().trim().regex(PHONE_PATTERN, t("phone")),

    gender: z.enum(GENDERS, t("gender")),

    /** A "yyyy-mm-dd" date of birth for someone aged between minAge and 100. */
    dateOfBirth: (minAge: number) =>
      z
        .string()
        .min(1, t("dobRequired"))
        // new Date() runs when the form is checked (a click), never while rendering.
        .refine((value) => ageOn(new Date(), value) >= minAge, t("minAge", { age: minAge }))
        .refine((value) => ageOn(new Date(), value) < MAX_AGE, t("dobInvalid")),

    /** A required whole number typed in a text box (the box gives a string). */
    wholeNumber: wholeNumberRule,

    /**
     * A required amount of money with at most 2 decimals, e.g. "1250" or "99.50".
     * `maxText` is the limit as shown in the message, e.g. useFormat().money(max).
     */
    money: (max: number, maxText: string = String(max)) =>
      z
        .string()
        .trim()
        .min(1, t("amountRequired"))
        .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), t("amountFormat"))
        .refine((v) => Number(v) > 0, t("amountPositive"))
        .refine((v) => Number(v) <= max, t("amountMax", { max: maxText })),

    /** Same as checkOptionalSection above, with translated messages. */
    checkOptionalSection(
      ctx: z.RefinementCtx,
      section: "address" | "healthRecord",
      values: AddressFields | HealthFields,
      required = false,
    ) {
      const empty =
        section === "address"
          ? isAddressEmpty(values as AddressFields)
          : isHealthEmpty(values as HealthFields);
      if (empty && !required) return;

      const result = (section === "address" ? addressRulesT : healthRulesT).safeParse(values);
      if (result.success) return;

      for (const issue of result.error.issues) {
        ctx.addIssue({ code: "custom", message: issue.message, path: [section, ...issue.path] });
      }
    },
  };
}
