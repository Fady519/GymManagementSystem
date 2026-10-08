"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Link2Off, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FormField, fieldProps } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { acceptInvite, resetPassword } from "@/features/auth/api";
import { AuthHeading, FormError } from "@/features/auth/components/auth-heading";
import { PasswordChecklist } from "@/features/auth/components/password-checklist";
import { setPasswordSchema, type SetPasswordValues } from "@/features/auth/schemas";
import { applyServerErrors } from "@/lib/form-errors";
import { Link, useRouter } from "@/i18n/navigation";

/**
 * Two pages share this form, because both are "choose a password using a link from an email":
 * - "reset":  /reset-password?email=...&token=...  (from "Forgot password")
 * - "invite": /set-password?email=...&token=...    (the gym created the account and invited the person)
 * The texts of each mode live under Auth.reset and Auth.invite.
 */
type Mode = "reset" | "invite";

export function SetPasswordForm({ mode }: { mode: Mode }) {
  const t = useTranslations("Auth");
  const tValidation = useTranslations("Validation");
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";
  const schema = useMemo(() => setPasswordSchema(tValidation), [tValidation]);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<SetPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const password = useWatch({ control, name: "password" });

  // The link must carry both values. Without them the API can only say "invalid link".
  if (!email || !token) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Link2Off className="size-7" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{t("incomplete.title")}</h1>
        <p className="mt-3 text-muted-foreground">
          {mode === "reset" ? t("incomplete.reset") : t("incomplete.invite")}
        </p>
        <Button size="lg" className="mt-8 h-11 w-full" asChild>
          <Link href={mode === "reset" ? "/forgot-password" : "/login"}>
            {mode === "reset" ? t("incomplete.requestNew") : t("incomplete.goToLogin")}
          </Link>
        </Button>
      </div>
    );
  }

  const onSubmit = async (values: SetPasswordValues) => {
    try {
      if (mode === "reset") {
        await resetPassword({ email, token, newPassword: values.password });
        router.replace("/login?reset=1");
      } else {
        await acceptInvite({ email, token, password: values.password });
        router.replace("/login?activated=1");
      }
    } catch (error) {
      // The API calls the field "newPassword" on reset and "password" on invite.
      applyServerErrors(error, setError, ["password"], { aliases: { newPassword: "password" } });
    }
  };

  const busy = isSubmitting || isSubmitSuccessful;

  return (
    <>
      <AuthHeading title={t(`${mode}.title`)} description={t(`${mode}.description`)} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
        <FormError message={errors.root?.server?.message} />

        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{t("accountLabel")} </span>
          <bdi dir="ltr" className="font-medium">
            {email}
          </bdi>
        </div>

        <FormField
          id="password"
          label={t("fields.newPassword")}
          error={errors.password?.message}
          description={<PasswordChecklist value={password} />}
        >
          <PasswordInput
            {...fieldProps("password", errors.password?.message, true)}
            autoComplete="new-password"
            autoFocus
            {...register("password")}
          />
        </FormField>

        <FormField
          id="confirmPassword"
          label={t("fields.confirmNewPassword")}
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            {...fieldProps("confirmPassword", errors.confirmPassword?.message)}
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
        </FormField>

        <Button type="submit" size="lg" className="mt-1 h-11 w-full" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <KeyRound />}
          {busy ? t(`${mode}.submitting`) : t(`${mode}.submit`)}
        </Button>
      </form>
    </>
  );
}
