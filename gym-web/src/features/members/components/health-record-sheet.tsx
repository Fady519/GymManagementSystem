"use client";

import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormError } from "@/components/shared/form-field";
import { FormSheet } from "@/components/shared/form-sheet";
import { HealthFieldset } from "@/features/members/components/health-fieldset";
import { useSaveHealthRecord } from "@/features/members/queries";
import { healthRecordSchema, type HealthRecordValues } from "@/features/members/schemas";
import { applyServerErrors } from "@/lib/form-errors";
import { healthToFields } from "@/lib/validation";
import type { MemberResponse } from "@/types";

const FORM_ID = "health-record-form";
const FIELDS = [
  "healthRecord.height",
  "healthRecord.weight",
  "healthRecord.bloodType",
  "healthRecord.note",
] as const;

type HealthFormProps = {
  member: MemberResponse;
  save: ReturnType<typeof useSaveHealthRecord>;
  onSaved: () => void;
};

function HealthForm({ member, save, onSaved }: HealthFormProps) {
  const form = useForm<HealthRecordValues>({
    resolver: zodResolver(healthRecordSchema),
    defaultValues: { healthRecord: healthToFields(member.healthRecord) },
  });
  const {
    handleSubmit,
    setError,
    formState: { errors },
  } = form;

  const onSubmit = async ({ healthRecord }: HealthRecordValues) => {
    try {
      await save.mutateAsync({
        id: member.id,
        body: {
          height: Number(healthRecord.height),
          weight: Number(healthRecord.weight),
          bloodType: healthRecord.bloodType,
          note: healthRecord.note.trim() || null,
        },
      });
      toast.success("Health record saved", {
        description: `${member.name}'s trainers will see the latest numbers.`,
      });
      onSaved();
    } catch (error) {
      // The API names these fields without the "healthRecord." prefix (the body is the record itself).
      applyServerErrors(error, setError, FIELDS, {
        aliases: {
          height: "healthRecord.height",
          weight: "healthRecord.weight",
          bloodType: "healthRecord.bloodType",
          note: "healthRecord.note",
        },
      });
    }
  };

  return (
    <FormProvider {...form}>
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
        <FormError message={errors.root?.server?.message} />
        <HealthFieldset />
      </form>
    </FormProvider>
  );
}

type HealthRecordSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberResponse;
};

/** The side panel for adding or updating a member's health record. */
export function HealthRecordSheet({ open, onOpenChange, member }: HealthRecordSheetProps) {
  const save = useSaveHealthRecord();
  const editing = member.healthRecord !== null;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Update health record" : "Add health record"}
      description="Height, weight and anything a coach should know before training them."
      formId={FORM_ID}
      submitLabel={editing ? "Save changes" : "Save record"}
      submitting={save.isPending}
    >
      <HealthForm member={member} save={save} onSaved={() => onOpenChange(false)} />
    </FormSheet>
  );
}
