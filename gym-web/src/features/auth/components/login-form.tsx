"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, fieldProps } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { login } from "@/features/auth/api";
import { AuthHeading, FormError } from "@/features/auth/components/auth-heading";
import { useStartSession } from "@/features/auth/hooks";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";
import { applyServerErrors } from "@/lib/form-errors";
import { Link } from "@/i18n/navigation";

/**
 * Demo logins for the public portfolio deployment. They only appear when
 * NEXT_PUBLIC_DEMO_PASSWORD is set (see .env.example), so a real gym never shows them.
 * `role` is the key of the button text in Enums.Role.
 */
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD;
const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@demo.gym" },
  { role: "Trainer", email: "trainer@demo.gym" },
  { role: "Member", email: "member@demo.gym" },
] as const;

export function LoginForm() {
  const t = useTranslations("Auth");
  const tValidation = useTranslations("Validation");
  const tRole = useTranslations("Enums.Role");
  const startSession = useStartSession();
  // Built from the current language's messages, rebuilt only when the language changes.
  const schema = useMemo(() => loginSchema(tValidation), [tValidation]);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      // GuestRedirect (in the auth layout) moves the user on once the session is saved.
      startSession(await login(values));
    } catch (error) {
      // e.g. Auth.InvalidCredentials -> "Email or password is incorrect." in the visitor's language.
      applyServerErrors(error, setError, ["email", "password"]);
    }
  };

  const loginAsDemo = (email: string) => {
    if (!DEMO_PASSWORD) return;
    setValue("email", email);
    setValue("password", DEMO_PASSWORD);
    void handleSubmit(onSubmit)();
  };

  // Stay disabled after success too: the redirect takes a moment.
  const busy = isSubmitting || isSubmitSuccessful;

  return (
    <>
      <AuthHeading title={t("login.title")} description={t("login.description")} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
        <FormError message={errors.root?.server?.message} />

        <FormField id="email" label={t("fields.email")} error={errors.email?.message}>
          <Input
            {...fieldProps("email", errors.email?.message)}
            type="email"
            dir="ltr"
            autoComplete="email"
            placeholder={t("fields.emailPlaceholder")}
            {...register("email")}
          />
        </FormField>

        <FormField
          id="password"
          label={t("fields.password")}
          error={errors.password?.message}
          labelAction={
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("login.forgot")}
            </Link>
          }
        >
          <PasswordInput
            {...fieldProps("password", errors.password?.message)}
            autoComplete="current-password"
            {...register("password")}
          />
        </FormField>

        <Button type="submit" size="lg" className="mt-1 h-11 w-full" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <LogIn className="rtl:rotate-180" />}
          {busy ? t("login.submitting") : t("login.submit")}
        </Button>
      </form>

      {DEMO_PASSWORD && (
        <div className="mt-8 rounded-xl border border-dashed p-4">
          <p className="text-sm font-medium">{t("login.demoTitle")}</p>
          <p className="mb-3 text-sm text-muted-foreground">{t("login.demoHint")}</p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => loginAsDemo(account.email)}
              >
                {tRole(account.role)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t("login.noAccount")}{" "}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("login.createAccount")}
        </Link>
      </p>
    </>
  );
}
