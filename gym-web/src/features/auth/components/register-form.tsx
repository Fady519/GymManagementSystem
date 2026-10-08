"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, fieldProps } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { register as registerAccount } from "@/features/auth/api";
import { AuthHeading, FormError } from "@/features/auth/components/auth-heading";
import { PasswordChecklist } from "@/features/auth/components/password-checklist";
import { useStartSession } from "@/features/auth/hooks";
import { registerSchema, type RegisterValues } from "@/features/auth/schemas";
import { applyServerErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

const FIELDS = ["name", "email", "phone", "dateOfBirth", "gender", "password"] as const;

/** API conflict codes, and the field each message belongs under. */
const CODE_TO_FIELD = {
  "Auth.EmailTaken": "email",
  "Auth.MemberAlreadyExists": "email",
  "Member.EmailTaken": "email",
  "Auth.PhoneTaken": "phone",
  "Member.PhoneTaken": "phone",
} as const;

const GENDERS = ["Male", "Female"] as const;

/** Sign-up for new members. One request creates the login account and the member profile. */
export function RegisterForm() {
  const startSession = useStartSession();
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      password: "",
      confirmPassword: "",
    },
  });
  const password = useWatch({ control, name: "password" });

  const onSubmit = async (values: RegisterValues) => {
    try {
      // confirmPassword is only for the form; the API doesn't need it.
      const auth = await registerAccount({
        name: values.name,
        email: values.email,
        phone: values.phone,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender,
        password: values.password,
      });
      toast.success(`Welcome to Power Fitness, ${auth.user.fullName.split(" ")[0]}!`);
      startSession(auth);
    } catch (error) {
      applyServerErrors(error, setError, FIELDS, { codes: CODE_TO_FIELD });
    }
  };

  const busy = isSubmitting || isSubmitSuccessful;

  return (
    <>
      <AuthHeading
        title="Create your account"
        description="Join in under a minute. Then pick a membership at the front desk and start booking classes."
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
        <FormError message={errors.root?.server?.message} />

        <FormField id="name" label="Full name" error={errors.name?.message}>
          <Input
            {...fieldProps("name", errors.name?.message)}
            autoComplete="name"
            placeholder="e.g. Ahmed Hassan"
            {...register("name")}
          />
        </FormField>

        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input
            {...fieldProps("email", errors.email?.message)}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email")}
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="phone" label="Mobile number" error={errors.phone?.message}>
            <Input
              {...fieldProps("phone", errors.phone?.message)}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="01012345678"
              maxLength={11}
              {...register("phone")}
            />
          </FormField>

          <FormField id="dateOfBirth" label="Date of birth" error={errors.dateOfBirth?.message}>
            <Input
              {...fieldProps("dateOfBirth", errors.dateOfBirth?.message)}
              type="date"
              autoComplete="bday"
              {...register("dateOfBirth")}
            />
          </FormField>
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm leading-none font-medium">Gender</legend>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((gender) => (
              <label
                key={gender}
                className={cn(
                  "flex h-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                  "hover:bg-muted has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary",
                  "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  errors.gender && "border-destructive",
                )}
              >
                <input
                  type="radio"
                  value={gender}
                  className="sr-only"
                  aria-describedby={errors.gender ? "gender-error" : undefined}
                  {...register("gender")}
                />
                {gender}
              </label>
            ))}
          </div>
          {errors.gender && (
            <p id="gender-error" role="alert" className="text-sm text-destructive">
              {errors.gender.message}
            </p>
          )}
        </fieldset>

        <FormField
          id="password"
          label="Password"
          error={errors.password?.message}
          description={<PasswordChecklist value={password} />}
        >
          <PasswordInput
            {...fieldProps("password", errors.password?.message, true)}
            autoComplete="new-password"
            {...register("password")}
          />
        </FormField>

        <FormField
          id="confirmPassword"
          label="Confirm password"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            {...fieldProps("confirmPassword", errors.confirmPassword?.message)}
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
        </FormField>

        <Button type="submit" size="lg" className="mt-1 h-11 w-full" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <UserPlus />}
          {busy ? "Creating your account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already a member?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
