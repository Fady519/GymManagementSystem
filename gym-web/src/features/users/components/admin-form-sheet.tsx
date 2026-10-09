"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { FormError, FormField, fieldProps } from "@/components/shared/form-field";
import { FormSheet } from "@/components/shared/form-sheet";
import { useCreateAdmin } from "@/features/users/queries";
import { applyServerErrors } from "@/lib/form-errors";
import { toastInvite } from "@/lib/notify";
import { validationRules } from "@/lib/validation";
import { isolate } from "@/lib/bidi";
import type { CreateAdminRequest } from "@/types";

const FORM_ID = "admin-form";
const FIELDS = ["fullName", "email"] as const;
const CODE_TO_FIELD = { "User.EmailTaken": "email" } as const;

function AdminForm({ onSave }: { onSave: (body: CreateAdminRequest) => Promise<void> }) {
  const t = useTranslations("Users.form");
  const tValidation = useTranslations("Validation");
  // Same rules as CreateAdminRequestValidator on the API, with messages in the current language.
  const schema = useMemo(() => {
    const rules = validationRules(tValidation);
    return z.object({ fullName: rules.personName, email: rules.emailAddress });
  }, [tValidation]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateAdminRequest>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "" },
  });

  const onSubmit = async (values: CreateAdminRequest) => {
    try {
      await onSave(values);
    } catch (error) {
      // "Email already used" goes under the email box; anything else shows above the form.
      applyServerErrors(error, setError, FIELDS, { codes: CODE_TO_FIELD });
    }
  };

  return (
    <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      <FormError message={errors.root?.server?.message} />

      <FormField id="admin-name" label={t("name")} error={errors.fullName?.message}>
        <Input
          {...fieldProps("admin-name", errors.fullName?.message)}
          placeholder={t("namePlaceholder")}
          maxLength={50}
          autoFocus
          // Text side follows what is typed (Arabic or English); an empty box keeps the page side.
          className="[unicode-bidi:plaintext]"
          {...register("fullName")}
        />
      </FormField>

      <FormField id="admin-email" label={t("email")} error={errors.email?.message}>
        <Input
          {...fieldProps("admin-email", errors.email?.message)}
          type="email"
          dir="ltr"
          placeholder="manager@example.com"
          maxLength={100}
          {...register("email")}
        />
      </FormField>

      <Alert>
        <Mail />
        <AlertDescription>{t("inviteNote")}</AlertDescription>
      </Alert>
    </form>
  );
}

/** The side panel where the Super admin adds a new Admin (name + email, then an invite email). */
export function AdminFormSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Users.form");
  const create = useCreateAdmin();

  const save = async (body: CreateAdminRequest) => {
    const result = await create.mutateAsync(body);
    toast.success(t("created", { name: isolate(result.user.fullName) }));
    toastInvite(result.user.fullName, result.user.email, result.inviteSent);
    onOpenChange(false);
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
      formId={FORM_ID}
      submitLabel={t("submit")}
      submitting={create.isPending}
    >
      <AdminForm onSave={save} />
    </FormSheet>
  );
}
