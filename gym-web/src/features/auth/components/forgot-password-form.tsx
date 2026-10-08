"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, MailCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, fieldProps } from "@/components/shared/form-field";
import { forgotPassword } from "@/features/auth/api";
import { AuthHeading, FormError } from "@/features/auth/components/auth-heading";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/features/auth/schemas";
import { applyServerErrors } from "@/lib/form-errors";

/**
 * Step 1 of resetting a password: the API emails a link to /reset-password.
 * The answer is the same whether the email exists or not, so this page can't be used
 * to find out who has an account.
 */
export function ForgotPasswordForm() {
  const [sent, setSent] = useState<{ email: string; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    try {
      const { message } = await forgotPassword(values);
      setSent({ email: values.email, message });
    } catch (error) {
      applyServerErrors(error, setError, ["email"]);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-7" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Check your inbox</h1>
        <p className="mt-3 text-muted-foreground">{sent.message}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Sent to <span className="font-medium text-foreground">{sent.email}</span>. The link works
          for a limited time, and don&apos;t forget to check your spam folder.
        </p>
        <div className="mt-8 grid gap-3">
          <Button size="lg" className="h-11" asChild>
            <Link href="/login">
              <ArrowLeft /> Back to log in
            </Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              setSent(null);
            }}
          >
            Use a different email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthHeading
        title="Forgot your password?"
        description="Enter the email you use at Power Fitness and we'll send you a link to choose a new one."
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
        <FormError message={errors.root?.server?.message} />

        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input
            {...fieldProps("email", errors.email?.message)}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email")}
          />
        </FormField>

        <Button type="submit" size="lg" className="mt-1 h-11 w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
          {isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to log in
        </Link>
      </p>
    </>
  );
}
