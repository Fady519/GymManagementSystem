"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Link2Off, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, fieldProps } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { acceptInvite, resetPassword } from "@/features/auth/api";
import { AuthHeading, FormError } from "@/features/auth/components/auth-heading";
import { PasswordChecklist } from "@/features/auth/components/password-checklist";
import { setPasswordSchema, type SetPasswordValues } from "@/features/auth/schemas";
import { applyServerErrors } from "@/lib/form-errors";

/**
 * Two pages share this form, because both are "choose a password using a link from an email":
 * - "reset":  /reset-password?email=...&token=...  (from "Forgot password")
 * - "invite": /set-password?email=...&token=...    (the gym created the account and invited the person)
 */
type Mode = "reset" | "invite";

const COPY: Record<Mode, { title: string; description: string; button: string; busy: string }> = {
  reset: {
    title: "Choose a new password",
    description: "Pick a strong password you haven't used here before.",
    button: "Update password",
    busy: "Updating…",
  },
  invite: {
    title: "Activate your account",
    description: "Welcome to Power Fitness! Create a password to start using your account.",
    button: "Activate account",
    busy: "Activating…",
  },
};

export function SetPasswordForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";
  const copy = COPY[mode];

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
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
        <h1 className="text-3xl font-extrabold tracking-tight">This link is incomplete</h1>
        <p className="mt-3 text-muted-foreground">
          {mode === "reset"
            ? "Open the link from your email again, or request a new one."
            : "Open the invitation link from your email again, or ask the gym to send a new one."}
        </p>
        <Button size="lg" className="mt-8 h-11 w-full" asChild>
          <Link href={mode === "reset" ? "/forgot-password" : "/login"}>
            {mode === "reset" ? "Request a new link" : "Go to log in"}
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
      <AuthHeading title={copy.title} description={copy.description} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
        <FormError message={errors.root?.server?.message} />

        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Account: </span>
          <span className="font-medium">{email}</span>
        </div>

        <FormField
          id="password"
          label="New password"
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
          label="Confirm new password"
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
          {busy ? copy.busy : copy.button}
        </Button>
      </form>
    </>
  );
}
