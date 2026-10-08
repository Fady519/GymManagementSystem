"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, fieldProps } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { PasswordInput } from "@/components/shared/password-input";
import { changePassword } from "@/features/auth/api";
import { FormError } from "@/features/auth/components/auth-heading";
import { PasswordChecklist } from "@/features/auth/components/password-checklist";
import { useAuth, useStartSession } from "@/features/auth/hooks";
import { changePasswordSchema, type ChangePasswordValues } from "@/features/auth/schemas";
import { applyServerErrors } from "@/lib/form-errors";
import { initialsOf } from "@/lib/format";
import { roleKey } from "@/lib/roles";

const EMPTY: ChangePasswordValues = { currentPassword: "", newPassword: "", confirmPassword: "" };

function ChangePasswordCard() {
  const startSession = useStartSession();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });
  const newPassword = useWatch({ control, name: "newPassword" });

  const onSubmit = async (values: ChangePasswordValues) => {
    try {
      // The API signs out every other device and gives this one a fresh session.
      const auth = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      startSession(auth);
      reset(EMPTY);
      toast.success("Password updated. You've been signed out on your other devices.");
    } catch (error) {
      applyServerErrors(error, setError, ["currentPassword", "newPassword"], {
        codes: { "Auth.WrongCurrentPassword": "currentPassword" },
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>
          For your security, changing your password signs you out everywhere else.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid max-w-md gap-5">
          <FormError message={errors.root?.server?.message} />

          <FormField
            id="currentPassword"
            label="Current password"
            error={errors.currentPassword?.message}
          >
            <PasswordInput
              {...fieldProps("currentPassword", errors.currentPassword?.message)}
              autoComplete="current-password"
              {...register("currentPassword")}
            />
          </FormField>

          <FormField
            id="newPassword"
            label="New password"
            error={errors.newPassword?.message}
            description={<PasswordChecklist value={newPassword} />}
          >
            <PasswordInput
              {...fieldProps("newPassword", errors.newPassword?.message, true)}
              autoComplete="new-password"
              {...register("newPassword")}
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

          <Button type="submit" className="h-10 w-fit px-5" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <KeyRound />}
            {isSubmitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Account settings, shared by every role: who you are, and changing your password. */
export function AccountSettings() {
  const tRoles = useTranslations("Roles");
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Account settings" description="Manage how you sign in to Power Fitness." />

      {user.mustChangePassword && (
        <Alert className="border-warning/50 bg-warning/10">
          <ShieldAlert />
          <AlertTitle>Choose a new password to continue</AlertTitle>
          <AlertDescription>
            Your account is using a temporary password. Set your own password below to unlock the
            rest of the app.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
              {initialsOf(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{user.fullName}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Badge variant="secondary">{tRoles(roleKey(user.roles))}</Badge>
        </CardContent>
      </Card>

      <ChangePasswordCard />
    </div>
  );
}
