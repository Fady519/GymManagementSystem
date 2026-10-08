"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField, fieldProps } from "@/components/shared/form-field";
import { FormSheet } from "@/components/shared/form-sheet";
import { isolate } from "@/lib/bidi";
import {
  MemberPicker,
  PaymentMethodPicker,
  PlanPicker,
  type PickedMember,
} from "@/features/memberships/components/membership-pickers";
import { useCreateMembership } from "@/features/memberships/queries";
import { sellSchema, type SellValues } from "@/features/memberships/schemas";
import { useFormat } from "@/hooks/use-format";
import { applyServerErrors } from "@/lib/form-errors";
import type { PlanResponse } from "@/types";

const FORM_ID = "sell-membership-form";
const FIELDS = ["memberId", "planId", "paymentMethod", "notes"] as const;
const CODE_TO_FIELD = {
  "Membership.AlreadyHasMembership": "memberId",
  "Membership.MemberNotFound": "memberId",
  "Membership.PlanNotFound": "planId",
  "Membership.PlanInactive": "planId",
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

type SellFormProps = {
  presetMember: PickedMember | null;
  create: ReturnType<typeof useCreateMembership>;
  onSaved: () => void;
};

function SellForm({ presetMember, create, onSaved }: SellFormProps) {
  const t = useTranslations("Memberships.sell");
  const tForm = useTranslations("Memberships.form");
  const tErrors = useTranslations("Memberships.errors");
  const tEnums = useTranslations("Enums.PaymentMethod");
  const f = useFormat();
  const [member, setMember] = useState<PickedMember | null>(presetMember);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  // Read the clock once (not on every render) for the end-date preview.
  const [openedAt] = useState(() => Date.now());
  const {
    handleSubmit,
    setError,
    setValue,
    register,
    control,
    formState: { errors },
  } = useForm<SellValues>({
    resolver: zodResolver(sellSchema(tErrors)),
    defaultValues: { memberId: presetMember?.id ?? 0, planId: "", notes: "" },
  });
  const paymentMethod = useWatch({ control, name: "paymentMethod" });

  const onSubmit = async (values: SellValues) => {
    try {
      const saved = await create.mutateAsync({
        memberId: values.memberId,
        planId: Number(values.planId),
        paymentMethod: values.paymentMethod,
        notes: values.notes || null,
      });
      toast.success(t("done", { name: isolate(saved.memberName) }), {
        description: t("doneBody", {
          plan: isolate(saved.planName),
          end: f.date(saved.endDate),
          amount: f.money(saved.pricePaid),
          method: tEnums(values.paymentMethod),
        }),
      });
      onSaved();
    } catch (error) {
      applyServerErrors(error, setError, FIELDS, { codes: CODE_TO_FIELD });
    }
  };

  const end = plan ? f.date(new Date(openedAt + plan.durationDays * DAY_MS)) : "";

  return (
    <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6">
      <FormError message={errors.root?.server?.message} />

      <FormField id="sell-member" label={tForm("member")} error={errors.memberId?.message}>
        <MemberPicker
          id="sell-member"
          value={member}
          invalid={Boolean(errors.memberId)}
          onChange={(picked) => {
            setMember(picked);
            setValue("memberId", picked?.id ?? 0, { shouldValidate: Boolean(errors.memberId) });
          }}
        />
      </FormField>

      <FormField id="sell-plan" label={tForm("plan")} error={errors.planId?.message}>
        <Controller
          control={control}
          name="planId"
          render={({ field }) => (
            <PlanPicker
              id="sell-plan"
              value={field.value}
              invalid={Boolean(errors.planId)}
              onChange={(planId, picked) => {
                field.onChange(planId);
                setPlan(picked);
              }}
            />
          )}
        />
      </FormField>

      <FormField id="sell-method" label={tForm("paidBy")} error={errors.paymentMethod?.message}>
        <Controller
          control={control}
          name="paymentMethod"
          render={({ field }) => (
            <PaymentMethodPicker
              id="sell-method"
              value={field.value}
              onChange={field.onChange}
              invalid={Boolean(errors.paymentMethod)}
            />
          )}
        />
      </FormField>

      <FormField id="sell-notes" label={tForm("notes")} error={errors.notes?.message}>
        <Textarea
          {...fieldProps("sell-notes", errors.notes?.message)}
          rows={2}
          maxLength={500}
          dir="auto"
          placeholder={t("notesPlaceholder")}
          {...register("notes")}
        />
      </FormField>

      {plan && (
        <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4">
          <CalendarCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">
              {paymentMethod
                ? t("previewAmountBy", {
                    amount: f.money(plan.price),
                    method: tEnums(paymentMethod),
                  })
                : f.money(plan.price)}
            </p>
            <p className="text-muted-foreground">
              {member
                ? t("previewPeriodMember", { end, name: isolate(member.name) })
                : t("previewPeriod", { end })}
            </p>
          </div>
        </div>
      )}
    </form>
  );
}

type SellMembershipSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opened from a member's profile: the member is already chosen. */
  presetMember?: PickedMember | null;
};

/** Sell a plan to a member: starts now and records the payment. */
export function SellMembershipSheet({
  open,
  onOpenChange,
  presetMember = null,
}: SellMembershipSheetProps) {
  const t = useTranslations("Memberships.sell");
  const create = useCreateMembership();

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
      <SellForm presetMember={presetMember} create={create} onSaved={() => onOpenChange(false)} />
    </FormSheet>
  );
}
