import { z } from "zod";
import {
  EMAIL_MAX,
  MAX_AGE,
  NAME_MAX,
  NAME_MIN,
  NAME_PATTERN,
  PHONE_PATTERN,
  ageOn,
} from "@/lib/validation";

/**
 * Form rules. They mirror the API validators (GymManagementBLL/Validators), so most mistakes are
 * caught before the request is sent. The API still checks everything: these are for a fast,
 * friendly form, not for security.
 * The shared numbers and patterns (same as CommonRules.cs) live in lib/validation.ts.
 */

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 100;
const MIN_AGE = 12;

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(EMAIL_MAX, `Email can be at most ${EMAIL_MAX} characters.`)
  .pipe(z.email("Enter a valid email address."));

/** The checks shown live under "new password" fields (see PasswordChecklist). */
export const PASSWORD_RULES = [
  { label: `At least ${PASSWORD_MIN} characters`, test: (v: string) => v.length >= PASSWORD_MIN },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "One number", test: (v: string) => /[0-9]/.test(v) },
] as const;

const newPassword = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Password can be at most ${PASSWORD_MAX} characters.`)
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/[0-9]/, "Password must contain a number.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(NAME_MIN, `Name must be at least ${NAME_MIN} characters.`)
      .max(NAME_MAX, `Name can be at most ${NAME_MAX} characters.`)
      .regex(NAME_PATTERN, "Name can only contain letters, spaces, dots, apostrophes and dashes."),
    email,
    phone: z
      .string()
      .trim()
      .regex(PHONE_PATTERN, "Enter an Egyptian mobile number, e.g. 01012345678."),
    dateOfBirth: z
      .string()
      .min(1, "Enter your date of birth.")
      .refine(
        (value) => ageOn(new Date(), value) >= MIN_AGE,
        `You must be at least ${MIN_AGE} years old.`,
      )
      .refine((value) => ageOn(new Date(), value) < MAX_AGE, "Enter a valid date of birth."),
    gender: z.enum(["Male", "Female"], "Select your gender."),
    password: newPassword,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

/** Used by both /reset-password and /set-password (invite): a new password typed twice. */
export const setPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  });
export type SetPasswordValues = z.infer<typeof setPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ["newPassword"],
    message: "The new password must be different from the current one.",
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
