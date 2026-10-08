import { z } from "zod";
import { money, wholeNumber } from "@/lib/validation";

/** Same limits as PlanValidators.cs (PlanRules). */
export const planSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(50, "Name can be at most 50 characters."),
  description: z
    .string()
    .trim()
    .min(5, "Describe the plan in at least 5 characters.")
    .max(200, "The description can be at most 200 characters."),
  durationDays: wholeNumber("duration", 1, 365),
  price: money("price", 100_000),
});

export type PlanValues = z.infer<typeof planSchema>;
