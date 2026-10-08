"use client";

import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
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
  const categories = useCategories();
  const form = useForm<TrainerValues>({
    resolver: zodResolver(trainerSchema),
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

        <FormField id="trainer-name" label="Full name" error={errors.name?.message}>
          <Input
            {...fieldProps("trainer-name", errors.name?.message)}
            placeholder="e.g. Omar Khaled"
            maxLength={50}
            autoFocus
            {...register("name")}
          />
        </FormField>

        <FormField
          id="trainer-email"
          label="Email"
          error={errors.email?.message}
          description={trainer?.hasAccount ? "Also their login email." : undefined}
        >
          <Input
            {...fieldProps("trainer-email", errors.email?.message, Boolean(trainer?.hasAccount))}
            type="email"
            placeholder="coach@example.com"
            maxLength={100}
            {...register("email")}
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="trainer-phone" label="Mobile number" error={errors.phone?.message}>
            <Input
              {...fieldProps("trainer-phone", errors.phone?.message)}
              type="tel"
              inputMode="numeric"
              placeholder="01012345678"
              maxLength={11}
              {...register("phone")}
            />
          </FormField>
          <FormField id="trainer-dob" label="Date of birth" error={errors.dateOfBirth?.message}>
            <Input
              {...fieldProps("trainer-dob", errors.dateOfBirth?.message)}
              type="date"
              {...register("dateOfBirth")}
            />
          </FormField>
        </div>

        <GenderField />

        <FormField id="trainer-category" label="Speciality" error={errors.categoryId?.message}>
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
                    placeholder={categories.isPending ? "Loading categories…" : "Choose a category"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {categories.data?.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
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
            <AlertDescription>
              We&apos;ll create their trainer login and email them a link to choose a password.
              Nobody else ever sees it.
            </AlertDescription>
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
  const create = useCreateTrainer();
  const update = useUpdateTrainer();

  const save = async (body: SaveTrainerRequest) => {
    if (trainer) {
      const saved = await update.mutateAsync({ id: trainer.id, body });
      toast.success("Trainer updated", { description: `${saved.name}'s details are saved.` });
    } else {
      const result = await create.mutateAsync(body);
      toast.success(`${result.trainer.name} joined the team`);
      toastInvite(result.trainer.name, result.trainer.email, result.inviteSent);
    }
    onOpenChange(false);
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={trainer ? `Edit ${trainer.name}` : "Add a trainer"}
      description={
        trainer
          ? "Update their details and speciality."
          : "Add a coach to the team. They can log in to see their schedule and take attendance."
      }
      formId={FORM_ID}
      submitLabel={trainer ? "Save changes" : "Add trainer"}
      submitting={create.isPending || update.isPending}
    >
      <TrainerForm trainer={trainer} onSave={save} />
    </FormSheet>
  );
}
