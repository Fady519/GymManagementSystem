"use client";

import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField, fieldProps } from "@/components/shared/form-field";
import { FormSheet } from "@/components/shared/form-sheet";
import { useSavePlan } from "@/features/plans/queries";
import {
  PLAN_DAYS_MAX,
  PLAN_DESCRIPTION_MAX,
  PLAN_NAME_MAX,
  planSchema,
  type PlanValues,
} from "@/features/plans/schemas";
import { useFormat } from "@/hooks/use-format";
import { applyServerErrors } from "@/lib/form-errors";
import { monthlyPrice } from "@/lib/format";
import { isolate } from "@/lib/bidi";
import type { PlanResponse } from "@/types";

const FORM_ID = "plan-form";
const FIELDS = ["name", "description", "durationDays", "price"] as const;

type PlanFormProps = {
  plan: PlanResponse | null;
  save: ReturnType<typeof useSavePlan>;
  onSaved: () => void;
};

function PlanForm({ plan, save, onSaved }: PlanFormProps) {
  const t = useTranslations("Plans.form");
  const tErrors = useTranslations("Plans.errors");
  const tValidation = useTranslations("Validation");
  const f = useFormat();
  // The rules with messages in the current language.
  const schema = useMemo(
    () => planSchema(tErrors, tValidation, f.money),
    [tErrors, tValidation, f.money],
  );
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<PlanValues>({
    resolver: zodResolver(schema),
    defaultValues: plan
      ? {
          name: plan.name,
          description: plan.description,
          durationDays: String(plan.durationDays),
          price: String(plan.price),
        }
      : { name: "", description: "", durationDays: "30", price: "" },
  });

  // Live preview of the monthly price, the number members compare plans by.
  const [days, price] = useWatch({ control, name: ["durationDays", "price"] });
  const daysNumber = Number(days);
  const priceNumber = Number(price);
  const validDays = daysNumber >= 1 && daysNumber <= PLAN_DAYS_MAX;
  const canPreview = validDays && priceNumber > 0;

  const onSubmit = async (values: PlanValues) => {
    try {
      const saved = await save.mutateAsync({
        id: plan?.id ?? null,
        body: {
          name: values.name,
          description: values.description,
          durationDays: Number(values.durationDays),
          price: Number(values.price),
        },
      });
      toast.success(plan ? t("updated") : t("created"), {
        description: plan
          ? t("updatedDescription", { name: isolate(saved.name), price: f.money(saved.price) })
          : t("createdDescription", { name: isolate(saved.name) }),
      });
      onSaved();
    } catch (error) {
      applyServerErrors(error, setError, FIELDS, { codes: { "Plan.NameTaken": "name" } });
    }
  };

  return (
    <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      <FormError message={errors.root?.server?.message} />

      <FormField id="plan-name" label={t("name")} error={errors.name?.message}>
        <Input
          {...fieldProps("plan-name", errors.name?.message)}
          placeholder={t("namePlaceholder")}
          maxLength={PLAN_NAME_MAX}
          autoFocus
          // Text side follows what is typed (Arabic or English); an empty box keeps the page side.
          className="[unicode-bidi:plaintext]"
          {...register("name")}
        />
      </FormField>

      <FormField
        id="plan-description"
        label={t("description")}
        error={errors.description?.message}
        description={t("descriptionHint")}
      >
        <Textarea
          {...fieldProps("plan-description", errors.description?.message, true)}
          placeholder={t("descriptionPlaceholder")}
          maxLength={PLAN_DESCRIPTION_MAX}
          rows={3}
          className="[unicode-bidi:plaintext]"
          {...register("description")}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="plan-duration"
          label={t("duration")}
          error={errors.durationDays?.message}
          description={
            validDays ? f.duration(daysNumber) : t("durationRange", { max: PLAN_DAYS_MAX })
          }
        >
          <Input
            {...fieldProps("plan-duration", errors.durationDays?.message, true)}
            inputMode="numeric"
            dir="ltr"
            maxLength={3}
            {...register("durationDays")}
          />
        </FormField>

        <FormField
          id="plan-price"
          label={t("price")}
          error={errors.price?.message}
          description={
            canPreview
              ? t("perMonthPreview", { price: f.money(monthlyPrice(priceNumber, daysNumber)) })
              : t("priceHint")
          }
        >
          <Input
            {...fieldProps("plan-price", errors.price?.message, true)}
            inputMode="decimal"
            dir="ltr"
            placeholder="1500"
            maxLength={9}
            {...register("price")}
          />
        </FormField>
      </div>
    </form>
  );
}

type PlanFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The plan to edit, or null to create a new one. */
  plan: PlanResponse | null;
};

/** The side panel for adding or editing a plan. */
export function PlanFormSheet({ open, onOpenChange, plan }: PlanFormSheetProps) {
  const t = useTranslations("Plans.form");
  const tCommon = useTranslations("Common");
  const save = useSavePlan();

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={plan ? t("titleEdit", { name: isolate(plan.name) }) : t("titleNew")}
      description={plan ? t("descriptionEdit") : t("descriptionNew")}
      formId={FORM_ID}
      submitLabel={plan ? tCommon("save") : t("submitNew")}
      submitting={save.isPending}
    >
      {/* The sheet unmounts its content when closed, so the form starts fresh every time it opens. */}
      <PlanForm plan={plan} save={save} onSaved={() => onOpenChange(false)} />
    </FormSheet>
  );
}
