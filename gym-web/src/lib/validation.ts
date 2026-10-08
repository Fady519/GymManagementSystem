import { z } from "zod";

/**
 * Form rules shared by many forms. They mirror the API validators (GymManagementBLL/Validators),
 * so most mistakes are caught before the request is sent. The API still checks everything:
 * these are for a fast, friendly form, not for security.
 */

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
