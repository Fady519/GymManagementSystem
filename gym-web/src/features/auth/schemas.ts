import { z } from "zod";
import { validationRules, type ValidationText } from "@/lib/validation";

/**
 * Form rules. They mirror the API validators (GymManagementBLL/Validators), so most mistakes are
 * caught before the request is sent. The API still checks everything: these are for a fast,
 * friendly form, not for security.
 * The shared numbers and patterns (same as CommonRules.cs) live in lib/validation.ts.
 *
 * Each schema is a function that takes the "Validation" messages, so errors are shown in the
 * visitor's language. Build it inside the form with useMemo:
 *   const tValidation = useTranslations("Validation");
 *   const schema = useMemo(() => loginSchema(tValidation), [tValidation]);
 */

export const PASSWORD_MIN = 8;
const PASSWORD_MAX = 100;
const MIN_AGE = 12;

/**
 * The checks shown live under "new password" fields (see PasswordChecklist).
 * `key` points at the text in Auth.passwordRules.
 */
export const PASSWORD_RULES = [
  { key: "min", test: (v: string) => v.length >= PASSWORD_MIN },
  { key: "upper", test: (v: string) => /[A-Z]/.test(v) },
  { key: "lower", test: (v: string) => /[a-z]/.test(v) },
  { key: "number", test: (v: string) => /[0-9]/.test(v) },
] as const;

function newPassword(t: ValidationText) {
  return z
    .string()
    .min(PASSWORD_MIN, t("passwordMin", { min: PASSWORD_MIN }))
    .max(PASSWORD_MAX, t("passwordMax", { max: PASSWORD_MAX }))
    .regex(/[A-Z]/, t("passwordUpper"))
    .regex(/[a-z]/, t("passwordLower"))
    .regex(/[0-9]/, t("passwordNumber"));
}

export function loginSchema(t: ValidationText) {
  return z.object({
    email: validationRules(t).emailAddress,
    password: z.string().min(1, t("passwordRequired")),
  });
}
export type LoginValues = z.infer<ReturnType<typeof loginSchema>>;

export function registerSchema(t: ValidationText) {
  const rules = validationRules(t);
  return z
    .object({
      name: rules.personName,
      email: rules.emailAddress,
      phone: rules.egyptianPhone,
      dateOfBirth: rules.dateOfBirth(MIN_AGE),
      gender: rules.gender,
      password: newPassword(t),
      confirmPassword: z.string().min(1, t("confirmPassword")),
    })
    .refine((values) => values.password === values.confirmPassword, {
      path: ["confirmPassword"],
      message: t("passwordsMismatch"),
    });
}
export type RegisterValues = z.infer<ReturnType<typeof registerSchema>>;

export function forgotPasswordSchema(t: ValidationText) {
  return z.object({ email: validationRules(t).emailAddress });
}
export type ForgotPasswordValues = z.infer<ReturnType<typeof forgotPasswordSchema>>;

/** Used by both /reset-password and /set-password (invite): a new password typed twice. */
export function setPasswordSchema(t: ValidationText) {
  return z
    .object({
      password: newPassword(t),
      confirmPassword: z.string().min(1, t("confirmPassword")),
    })
    .refine((values) => values.password === values.confirmPassword, {
      path: ["confirmPassword"],
      message: t("passwordsMismatch"),
    });
}
export type SetPasswordValues = z.infer<ReturnType<typeof setPasswordSchema>>;

export function changePasswordSchema(t: ValidationText) {
  return z
    .object({
      currentPassword: z.string().min(1, t("currentPasswordRequired")),
      newPassword: newPassword(t),
      confirmPassword: z.string().min(1, t("confirmNewPassword")),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      path: ["confirmPassword"],
      message: t("passwordsMismatch"),
    })
    .refine((values) => values.newPassword !== values.currentPassword, {
      path: ["newPassword"],
      message: t("passwordSame"),
    });
}
export type ChangePasswordValues = z.infer<ReturnType<typeof changePasswordSchema>>;
