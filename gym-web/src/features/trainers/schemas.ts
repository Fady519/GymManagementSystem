import { z } from "zod";
import {
  addressFields,
  checkOptionalSection,
  dateOfBirth,
  egyptianPhone,
  emailAddress,
  gender,
  personName,
} from "@/lib/validation";

/** Same rules as SaveTrainerRequestValidator (trainers must be at least 18). */
export const trainerSchema = z
  .object({
    name: personName,
    email: emailAddress,
    phone: egyptianPhone,
    dateOfBirth: dateOfBirth(18),
    gender,
    // The <Select> gives the id as a string; it's turned into a number when sending.
    categoryId: z.string().min(1, "Choose the trainer's speciality."),
    address: addressFields,
  })
  .superRefine((values, ctx) => checkOptionalSection(ctx, "address", values.address));

export type TrainerValues = z.infer<typeof trainerSchema>;
