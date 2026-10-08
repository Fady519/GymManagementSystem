"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, MailCheck, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, fieldProps } from "@/components/shared/form-field";
import { forgotPassword } from "@/features/auth/api";
import { AuthHeading, FormError } from "@/features/auth/components/auth-heading";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/features/auth/schemas";
import { applyServerErrors } from "@/lib/form-errors";
import { Link } from "@/i18n/navigation";

/**
 * Step 1 of resetting a password: the API emails a link to /reset-password.
 * The answer is the same whether the email exists or not, so this page can't be used
 * to find out who has an account.
 */
export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const tValidation = useTranslations("Validation");
  const schema = useMemo(() => forgotPasswordSchema(tValidation), [tValidation]);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    try {
      // The API answers with a fixed English sentence; we show our own translation of it instead.
      await forgotPassword(values);
      setSentTo(values.email);
    } catch (error) {
      applyServerErrors(error, setError, ["email"]);
    }
  };

  if (sentTo) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-7" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{t("forgot.sentTitle")}</h1>
        <p className="mt-3 text-muted-foreground">{t("forgot.sentBody")}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.rich("forgot.sentTo", {
            address: sentTo,
            // The email is user data: shown as typed, left-to-right even inside Arabic text.
            email: (chunks) => (
              <bdi dir="ltr" className="font-medium text-foreground">
                {chunks}
              </bdi>
            ),
          })}
        </p>
        <div className="mt-8 grid gap-3">
          <Button size="lg" className="h-11" asChild>
            <Link href="/login">
              <ArrowLeft className="rtl:rotate-180" /> {t("forgot.back")}
            </Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              setSentTo(null);
            }}
          >
            {t("forgot.differentEmail")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title={t("forgot.title")} description={t("forgot.description")} />

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

        <Button type="submit" size="lg" className="mt-1 h-11 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Send className="rtl:-scale-x-100" />
          )}
          {isSubmitting ? t("forgot.submitting") : t("forgot.submit")}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t("forgot.remembered")}{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("forgot.back")}
        </Link>
      </p>
    </>
  );
}
