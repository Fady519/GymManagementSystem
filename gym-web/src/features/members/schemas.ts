import { z } from "zod";
import {
  addressFields,
  checkOptionalSection,
  dateOfBirth,
  egyptianPhone,
  emailAddress,
  gender,
  healthFields,
  personName,
} from "@/lib/validation";

/** Same rules as CreateMemberRequestValidator / UpdateMemberRequestValidator (members are 12+). */
const personal = {
  name: personName,
  email: emailAddress,
  phone: egyptianPhone,
  dateOfBirth: dateOfBirth(12),
  gender,
};

/** The add-member wizard: personal data is required, address and health are optional. */
export const createMemberSchema = z
  .object({ ...personal, address: addressFields, healthRecord: healthFields })
  .superRefine((values, ctx) => {
    checkOptionalSection(ctx, "address", values.address);
    checkOptionalSection(ctx, "healthRecord", values.healthRecord);
  });
export type CreateMemberValues = z.infer<typeof createMemberSchema>;

/** Editing a member (health has its own form). */
export const editMemberSchema = z
  .object({ ...personal, address: addressFields })
  .superRefine((values, ctx) => checkOptionalSection(ctx, "address", values.address));
export type EditMemberValues = z.infer<typeof editMemberSchema>;

/** The health record form on the member's page: here the section is the whole point, so it's required. */
export const healthRecordSchema = z
  .object({ healthRecord: healthFields })
  .superRefine((values, ctx) =>
    checkOptionalSection(ctx, "healthRecord", values.healthRecord, true),
  );
export type HealthRecordValues = z.infer<typeof healthRecordSchema>;

/** Photo rules, same as the API: JPG, PNG or WEBP up to 2 MB. Checked before uploading. */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

/** An error message for a picked file, or null when it's fine. */
export function photoProblem(file: File): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return "Choose a JPG, PNG or WEBP image.";
  if (file.size > PHOTO_MAX_BYTES) return "The photo is larger than 2 MB. Choose a smaller one.";
  return null;
}
