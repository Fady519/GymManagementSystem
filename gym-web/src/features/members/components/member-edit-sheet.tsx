"use client";

import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FormError, FormField, fieldProps } from "@/components/shared/form-field";
import { FormSheet } from "@/components/shared/form-sheet";
import { AddressFieldset, GenderField } from "@/components/shared/person-fields";
import { isolate } from "@/lib/bidi";
import { useUpdateMember } from "@/features/members/queries";
import { editMemberSchema, type EditMemberValues } from "@/features/members/schemas";
import { applyServerErrors } from "@/lib/form-errors";
import { addressToFields, toAddressDto } from "@/lib/validation";
import type { MemberResponse } from "@/types";

const FORM_ID = "member-edit-form";
const FIELDS = [
  "name",
  "email",
  "phone",
  "dateOfBirth",
  "gender",
  "address.buildingNumber",
  "address.street",
  "address.city",
] as const;

type MemberEditFormProps = {
  member: MemberResponse;
  /** Shared with the sheet, so its Save button shows the spinner while this form saves. */
  update: ReturnType<typeof useUpdateMember>;
  onSaved: () => void;
};

function MemberEditForm({ member, update, onSaved }: MemberEditFormProps) {
  const t = useTranslations("Members.form");
  const tEdit = useTranslations("Members.edit");
  const tErrors = useTranslations("Members.errors");
  const form = useForm<EditMemberValues>({
    resolver: zodResolver(editMemberSchema(tErrors)),
    defaultValues: {
      name: member.name,
      email: member.email,
      phone: member.phone,
      dateOfBirth: member.dateOfBirth,
      gender: member.gender,
      address: addressToFields(member.address),
    },
  });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = form;

  const onSubmit = async (values: EditMemberValues) => {
    try {
      const saved = await update.mutateAsync({
        id: member.id,
        body: {
          name: values.name,
          email: values.email,
          phone: values.phone,
          dateOfBirth: values.dateOfBirth,
          gender: values.gender,
          address: toAddressDto(values.address),
        },
      });
      toast.success(tEdit("saved"), {
        description: tEdit("savedBody", { name: isolate(saved.name) }),
      });
      onSaved();
    } catch (error) {
      applyServerErrors(error, setError, FIELDS, {
        codes: { "Member.EmailTaken": "email", "Member.PhoneTaken": "phone" },
      });
    }
  };

  return (
    <FormProvider {...form}>
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
        <FormError message={errors.root?.server?.message} />
        <FormField id="edit-name" label={t("name")} error={errors.name?.message}>
          <Input
            {...fieldProps("edit-name", errors.name?.message)}
            maxLength={50}
            dir="auto"
            {...register("name")}
          />
        </FormField>
        <FormField
          id="edit-email"
          label={t("email")}
          error={errors.email?.message}
          description={member.hasAccount ? tEdit("emailIsLogin") : undefined}
        >
          <Input
            {...fieldProps("edit-email", errors.email?.message, member.hasAccount)}
            type="email"
            dir="ltr"
            maxLength={100}
            {...register("email")}
          />
        </FormField>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="edit-phone" label={t("phone")} error={errors.phone?.message}>
            <Input
              {...fieldProps("edit-phone", errors.phone?.message)}
              type="tel"
              inputMode="numeric"
              dir="ltr"
              maxLength={11}
              {...register("phone")}
            />
          </FormField>
          <FormField id="edit-dob" label={t("dateOfBirth")} error={errors.dateOfBirth?.message}>
            <Input
              {...fieldProps("edit-dob", errors.dateOfBirth?.message)}
              type="date"
              {...register("dateOfBirth")}
            />
          </FormField>
        </div>
        <GenderField />
        <Separator />
        <AddressFieldset />
      </form>
    </FormProvider>
  );
}

type MemberEditSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberResponse;
};

/** The side panel for editing a member's personal details and address. */
export function MemberEditSheet({ open, onOpenChange, member }: MemberEditSheetProps) {
  const t = useTranslations("Members.edit");
  const tCommon = useTranslations("Common");
  const update = useUpdateMember();

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("title", { name: isolate(member.name) })}
      description={t("description")}
      formId={FORM_ID}
      submitLabel={tCommon("save")}
      submitting={update.isPending}
    >
      <MemberEditForm member={member} update={update} onSaved={() => onOpenChange(false)} />
    </FormSheet>
  );
}
