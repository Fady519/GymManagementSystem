"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField, fieldProps } from "@/components/shared/form-field";
import { FormSheet } from "@/components/shared/form-sheet";
import { useSavePlan } from "@/features/plans/queries";
import { planSchema, type PlanValues } from "@/features/plans/schemas";
import { applyServerErrors } from "@/lib/form-errors";
import { formatDuration, formatMoney, monthlyPrice } from "@/lib/format";
import type { PlanResponse } from "@/types";

const FORM_ID = "plan-form";
const FIELDS = ["name", "description", "durationDays", "price"] as const;

type PlanFormProps = {
  plan: PlanResponse | null;
  save: ReturnType<typeof useSavePlan>;
  onSaved: () => void;
};

function PlanForm({ plan, save, onSaved }: PlanFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<PlanValues>({
    resolver: zodResolver(planSchema),
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
  const canPreview = daysNumber >= 1 && daysNumber <= 365 && priceNumber > 0;

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
      toast.success(plan ? "Plan updated" : "Plan created", {
        description: plan
          ? `${saved.name} now costs ${formatMoney(saved.price)}. Existing memberships keep their old price.`
          : `${saved.name} is active and ready to sell.`,
      });
      onSaved();
    } catch (error) {
      applyServerErrors(error, setError, FIELDS, { codes: { "Plan.NameTaken": "name" } });
    }
  };

  return (
    <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      <FormError message={errors.root?.server?.message} />

      <FormField id="plan-name" label="Plan name" error={errors.name?.message}>
        <Input
          {...fieldProps("plan-name", errors.name?.message)}
          placeholder="e.g. Quarterly"
          maxLength={50}
          autoFocus
          {...register("name")}
        />
      </FormField>

      <FormField
        id="plan-description"
        label="Description"
        error={errors.description?.message}
        description="Shown to visitors on the pricing section of the website."
      >
        <Textarea
          {...fieldProps("plan-description", errors.description?.message, true)}
          placeholder="e.g. Full gym access for 3 months, all classes included."
          maxLength={200}
          rows={3}
          {...register("description")}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="plan-duration"
          label="Duration (days)"
          error={errors.durationDays?.message}
          description={
            daysNumber >= 1 && daysNumber <= 365 ? formatDuration(daysNumber) : "1–365 days"
          }
        >
          <Input
            {...fieldProps("plan-duration", errors.durationDays?.message, true)}
            inputMode="numeric"
            maxLength={3}
            {...register("durationDays")}
          />
        </FormField>

        <FormField
          id="plan-price"
          label="Price (EGP)"
          error={errors.price?.message}
          description={
            canPreview
              ? `≈ ${formatMoney(monthlyPrice(priceNumber, daysNumber))} per month`
              : "The full price paid upfront"
          }
        >
          <Input
            {...fieldProps("plan-price", errors.price?.message, true)}
            inputMode="decimal"
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
  const save = useSavePlan();

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={plan ? `Edit ${plan.name}` : "New plan"}
      description={
        plan
          ? "Changes apply to new sales and renewals. Members who already paid keep what they bought."
          : "Create a membership plan. It goes on sale as soon as you save it."
      }
      formId={FORM_ID}
      submitLabel={plan ? "Save changes" : "Create plan"}
      submitting={save.isPending}
    >
      {/* The sheet unmounts its content when closed, so the form starts fresh every time it opens. */}
      <PlanForm plan={plan} save={save} onSaved={() => onOpenChange(false)} />
    </FormSheet>
  );
}
