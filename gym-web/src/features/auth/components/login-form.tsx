"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LogIn } from "lucide-react";
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
 */
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD;
const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@demo.gym" },
  { label: "Trainer", email: "trainer@demo.gym" },
  { label: "Member", email: "member@demo.gym" },
];

export function LoginForm() {
  const startSession = useStartSession();
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      // GuestRedirect (in the auth layout) moves the user on once the session is saved.
      startSession(await login(values));
    } catch (error) {
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
      <AuthHeading
        title="Welcome back"
        description="Log in to book classes, follow your membership and manage your day at the gym."
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

        <FormField
          id="password"
          label="Password"
          error={errors.password?.message}
          labelAction={
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
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
          {busy ? <Loader2 className="animate-spin" /> : <LogIn />}
          {busy ? "Logging in…" : "Log in"}
        </Button>
      </form>

      {DEMO_PASSWORD && (
        <div className="mt-8 rounded-xl border border-dashed p-4">
          <p className="text-sm font-medium">Exploring the demo?</p>
          <p className="mb-3 text-sm text-muted-foreground">
            Log in instantly with a sample account.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => loginAsDemo(account.email)}
              >
                {account.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New to Power Fitness?{" "}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Create your account
        </Link>
      </p>
    </>
  );
}
