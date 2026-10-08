"use client";

import { useMemo } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormError, FormField, fieldProps } from "@/components/shared/form-field";
import { FormSheet } from "@/components/shared/form-sheet";
import { AddressFieldset, GenderField } from "@/components/shared/person-fields";
import { useCategories } from "@/features/categories/queries";
import { useCreateTrainer, useUpdateTrainer } from "@/features/trainers/queries";
import { trainerSchema, type TrainerValues } from "@/features/trainers/schemas";
import { applyServerErrors } from "@/lib/form-errors";
import { toastInvite } from "@/lib/notify";
import { EMPTY_ADDRESS, addressToFields, toAddressDto } from "@/lib/validation";
import { isolate } from "@/lib/bidi";
import type { SaveTrainerRequest, TrainerResponse } from "@/types";

const FORM_ID = "trainer-form";
const FIELDS = [
  "name",
  "email",
  "phone",
  "dateOfBirth",
  "gender",
  "categoryId",
  "address.buildingNumber",
  "address.street",
  "address.city",
] as const;

const CODE_TO_FIELD = {
  "Trainer.EmailTaken": "email",
  "Trainer.PhoneTaken": "phone",
  "Trainer.CategoryNotFound": "categoryId",
} as const;

type TrainerFormProps = {
  trainer: TrainerResponse | null;
  onSave: (body: SaveTrainerRequest) => Promise<void>;
};

function TrainerForm({ trainer, onSave }: TrainerFormProps) {
  const t = useTranslations("Trainers.form");
  const tErrors = useTranslations("Trainers.errors");
  const tValidation = useTranslations("Validation");
  // The rules with messages in the current language.
  const schema = useMemo(() => trainerSchema(tErrors, tValidation), [tErrors, tValidation]);
  const categories = useCategories();
  const form = useForm<TrainerValues>({
    resolver: zodResolver(schema),
    defaultValues: trainer
      ? {
          name: trainer.name,
          email: trainer.email,
          phone: trainer.phone,
          dateOfBirth: trainer.dateOfBirth,
          gender: trainer.gender,
          categoryId: String(trainer.categoryId),
          address: addressToFields(trainer.address),
        }
      : {
          name: "",
          email: "",
          phone: "",
          dateOfBirth: "",
          categoryId: "",
          address: EMPTY_ADDRESS,
        },
  });
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = form;

  const onSubmit = async (values: TrainerValues) => {
    try {
      await onSave({
        name: values.name,
        email: values.email,
        phone: values.phone,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender,
        categoryId: Number(values.categoryId),
        address: toAddressDto(values.address),
      });
    } catch (error) {
      applyServerErrors(error, setError, FIELDS, { codes: CODE_TO_FIELD });
    }
  };

  return (
    // FormProvider lets GenderField and AddressFieldset read this form without props.
    <FormProvider {...form}>
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
        <FormError message={errors.root?.server?.message} />

        <FormField id="trainer-name" label={t("name")} error={errors.name?.message}>
          <Input
            {...fieldProps("trainer-name", errors.name?.message)}
            placeholder={t("namePlaceholder")}
            maxLength={50}
            autoFocus
            // Text side follows what is typed (Arabic or English); an empty box keeps the page side.
            className="[unicode-bidi:plaintext]"
            {...register("name")}
          />
        </FormField>

        <FormField
          id="trainer-email"
          label={t("email")}
          error={errors.email?.message}
          description={trainer?.hasAccount ? t("emailHint") : undefined}
        >
          <Input
            {...fieldProps("trainer-email", errors.email?.message, Boolean(trainer?.hasAccount))}
            type="email"
            dir="ltr"
            placeholder="coach@example.com"
            maxLength={100}
            {...register("email")}
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="trainer-phone" label={t("phone")} error={errors.phone?.message}>
            <Input
              {...fieldProps("trainer-phone", errors.phone?.message)}
              type="tel"
              dir="ltr"
              inputMode="numeric"
              placeholder="01012345678"
              maxLength={11}
              {...register("phone")}
            />
          </FormField>
          <FormField id="trainer-dob" label={t("dateOfBirth")} error={errors.dateOfBirth?.message}>
            <Input
              {...fieldProps("trainer-dob", errors.dateOfBirth?.message)}
              type="date"
              dir="ltr"
              {...register("dateOfBirth")}
            />
          </FormField>
        </div>

        <GenderField />

        <FormField id="trainer-category" label={t("category")} error={errors.categoryId?.message}>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  {...fieldProps("trainer-category", errors.categoryId?.message)}
                  className="w-full"
                  onBlur={field.onBlur}
                  disabled={categories.isPending}
                >
                  <SelectValue
                    placeholder={
                      categories.isPending ? t("categoryLoading") : t("categoryPlaceholder")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {categories.data?.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      <bdi>{category.name}</bdi>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <Separator />
        <AddressFieldset />

        {!trainer && (
          <Alert>
            <Mail />
            <AlertDescription>{t("inviteNote")}</AlertDescription>
          </Alert>
        )}
      </form>
    </FormProvider>
  );
}

type TrainerFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainer: TrainerResponse | null;
};

/** The side panel for adding or editing a trainer. */
export function TrainerFormSheet({ open, onOpenChange, trainer }: TrainerFormSheetProps) {
  const t = useTranslations("Trainers.form");
  const tCommon = useTranslations("Common");
  const create = useCreateTrainer();
  const update = useUpdateTrainer();

  const save = async (body: SaveTrainerRequest) => {
    if (trainer) {
      const saved = await update.mutateAsync({ id: trainer.id, body });
      toast.success(t("updated"), {
        description: t("updatedDescription", { name: isolate(saved.name) }),
      });
    } else {
      const result = await create.mutateAsync(body);
      toast.success(t("joined", { name: isolate(result.trainer.name) }));
      toastInvite(result.trainer.name, result.trainer.email, result.inviteSent);
    }
    onOpenChange(false);
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={trainer ? t("titleEdit", { name: isolate(trainer.name) }) : t("titleNew")}
      description={trainer ? t("descriptionEdit") : t("descriptionNew")}
      formId={FORM_ID}
      submitLabel={trainer ? tCommon("save") : t("submitNew")}
      submitting={create.isPending || update.isPending}
    >
      <TrainerForm trainer={trainer} onSave={save} />
    </FormSheet>
  );
}
