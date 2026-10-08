"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Snowflake } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormError, FormField, fieldProps } from "@/components/shared/form-field";
import { isolate } from "@/lib/bidi";
import {
  PaymentMethodPicker,
  PlanPicker,
} from "@/features/memberships/components/membership-pickers";
import {
  useCancelMembership,
  useFreezeMembership,
  useRenewMembership,
  useUnfreezeMembership,
} from "@/features/memberships/queries";
import {
  FREEZE_RULES,
  cancelMembershipSchema,
  freezeAllowance,
  freezeSchema,
  renewSchema,
  type CancelMembershipValues,
  type FreezeValues,
  type RenewValues,
} from "@/features/memberships/schemas";
import { useFormat } from "@/hooks/use-format";
import { applyServerErrors } from "@/lib/form-errors";
import { firstName } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { MembershipResponse, PaymentMethod, PlanResponse } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const addDaysTo = (date: string | number, days: number) =>
  new Date(new Date(date).getTime() + days * DAY_MS);

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: MembershipResponse | null;
};

/** "Before → after" line used in the previews. */
function Change({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-medium tabular-nums">
        <span className="text-muted-foreground line-through decoration-1">{before}</span>
        <ArrowRight className="size-3.5 text-muted-foreground rtl:rotate-180" />
        {after}
      </span>
    </div>
  );
}

// ---------- Renew ----------

function RenewForm({ membership, onDone }: { membership: MembershipResponse; onDone: () => void }) {
  const t = useTranslations("Memberships.renew");
  const tForm = useTranslations("Memberships.form");
  const tErrors = useTranslations("Memberships.errors");
  const tCommon = useTranslations("Common");
  const f = useFormat();
  const renew = useRenewMembership();
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [openedAt] = useState(() => Date.now());
  const {
    control,
    handleSubmit,
    register,
    setError,
    formState: { errors },
  } = useForm<RenewValues>({
    resolver: zodResolver(renewSchema(tErrors)),
    defaultValues: { planId: "", notes: "" },
  });

  // A running membership: the renewal starts the moment it ends. An ended one: it starts now.
  const queued = new Date(membership.endDate).getTime() > openedAt;
  const start = queued ? new Date(membership.endDate).getTime() : openedAt;

  const onSubmit = async (values: RenewValues) => {
    try {
      const saved = await renew.mutateAsync({
        id: membership.id,
        body: {
          planId: Number(values.planId),
          paymentMethod: values.paymentMethod,
          notes: values.notes || null,
        },
      });
      toast.success(t("done"), {
        description: t("doneBody", {
          name: isolate(saved.memberName),
          plan: isolate(saved.planName),
          start: f.date(saved.startDate),
          end: f.date(saved.endDate),
        }),
      });
      onDone();
    } catch (error) {
      applyServerErrors(error, setError, ["planId", "paymentMethod", "notes"], {
        codes: { "Membership.PlanInactive": "planId", "Membership.PlanNotFound": "planId" },
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      <FormError message={errors.root?.server?.message} />
      <FormField id="renew-plan" label={tForm("plan")} error={errors.planId?.message}>
        <Controller
          control={control}
          name="planId"
          render={({ field }) => (
            <PlanPicker
              id="renew-plan"
              value={field.value}
              currentPlanId={membership.planId}
              invalid={Boolean(errors.planId)}
              onChange={(planId, picked) => {
                field.onChange(planId);
                setPlan(picked);
              }}
            />
          )}
        />
      </FormField>
      <FormField id="renew-method" label={tForm("paidBy")} error={errors.paymentMethod?.message}>
        <Controller
          control={control}
          name="paymentMethod"
          render={({ field }) => (
            <PaymentMethodPicker
              id="renew-method"
              value={field.value}
              onChange={field.onChange}
              invalid={Boolean(errors.paymentMethod)}
            />
          )}
        />
      </FormField>
      <FormField id="renew-notes" label={tForm("notes")} error={errors.notes?.message}>
        <Input
          {...fieldProps("renew-notes", errors.notes?.message)}
          maxLength={500}
          dir="auto"
          {...register("notes")}
        />
      </FormField>
      {plan && (
        <p className="rounded-lg bg-muted/60 p-3 text-sm">
          <span className="font-semibold">{f.money(plan.price)}</span> ·{" "}
          {t(queued ? "previewQueued" : "previewToday", {
            start: f.date(new Date(start)),
            end: f.date(addDaysTo(start, plan.durationDays)),
          })}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={renew.isPending}>
          {tCommon("close")}
        </Button>
        <Button type="submit" disabled={renew.isPending}>
          {renew.isPending && <Loader2 className="animate-spin" />}
          {t("confirm")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RenewMembershipDialog({ open, onOpenChange, membership }: DialogProps) {
  const t = useTranslations("Memberships.renew");
  const f = useFormat();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {membership && (
          <>
            <DialogHeader>
              <DialogTitle>{t("title", { name: isolate(membership.memberName) })}</DialogTitle>
              <DialogDescription>
                {t("description", {
                  plan: isolate(membership.planName),
                  end: f.date(membership.endDate),
                })}
              </DialogDescription>
            </DialogHeader>
            <RenewForm membership={membership} onDone={() => onOpenChange(false)} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- Freeze ----------

function FreezeForm({
  membership,
  onDone,
}: {
  membership: MembershipResponse;
  onDone: () => void;
}) {
  const t = useTranslations("Memberships.freeze");
  const tForm = useTranslations("Memberships.form");
  const tErrors = useTranslations("Memberships.errors");
  const tEnums = useTranslations("Enums.MembershipState");
  const tCommon = useTranslations("Common");
  const f = useFormat();
  const freeze = useFreezeMembership();
  const [openedAt] = useState(() => Date.now());
  const allowance = freezeAllowance(membership.totalFrozenDays);
  const maxDays = Math.min(FREEZE_RULES.maxDays, allowance);
  const {
    control,
    handleSubmit,
    register,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FreezeValues>({
    resolver: zodResolver(freezeSchema(tErrors, maxDays)),
    defaultValues: { days: String(Math.min(7, maxDays)), reason: "" },
  });
  const daysText = useWatch({ control, name: "days" });
  const days = Number(daysText);
  const validDays = Number.isInteger(days) && days >= FREEZE_RULES.minDays && days <= maxDays;
  const quickPicks = [7, 14, 21, 30].filter((d) => d <= maxDays);

  const onSubmit = async (values: FreezeValues) => {
    try {
      const saved = await freeze.mutateAsync({
        id: membership.id,
        days: Number(values.days),
        reason: values.reason || null,
      });
      toast.success(t("done", { name: isolate(saved.memberName) }), {
        description: t("doneBody", {
          until: f.date(saved.frozenUntil!),
          end: f.date(saved.endDate),
        }),
      });
      onDone();
    } catch (error) {
      applyServerErrors(error, setError, ["days", "reason"], {
        codes: { "Membership.FreezeLimitReached": "days" },
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      <FormError message={errors.root?.server?.message} />
      <FormField
        id="freeze-days"
        label={t("days")}
        error={errors.days?.message}
        description={t("daysHint", {
          min: f.number(FREEZE_RULES.minDays),
          max: f.number(maxDays),
          left: f.number(allowance),
          total: f.number(FREEZE_RULES.maxTotalDays),
        })}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            {...fieldProps("freeze-days", errors.days?.message, true)}
            inputMode="numeric"
            maxLength={2}
            className="w-20"
            autoFocus
            {...register("days")}
          />
          {quickPicks.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setValue("days", String(d), { shouldValidate: true })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                days === d
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {f.days(d)}
            </button>
          ))}
        </div>
      </FormField>
      <FormField id="freeze-reason" label={tForm("reason")} error={errors.reason?.message}>
        <Input
          {...fieldProps("freeze-reason", errors.reason?.message)}
          maxLength={200}
          dir="auto"
          placeholder={t("reasonPlaceholder")}
          {...register("reason")}
        />
      </FormField>

      <div className="space-y-2 rounded-xl border bg-sky-500/5 p-4">
        <Change label={t("status")} before={tEnums("Active")} after={tEnums("Frozen")} />
        <Change
          label={t("frozenUntil")}
          before="—"
          after={validDays ? f.date(addDaysTo(openedAt, days)) : "—"}
        />
        <Change
          label={t("endsOn")}
          before={f.date(membership.endDate)}
          after={validDays ? f.date(addDaysTo(membership.endDate, days)) : "—"}
        />
        <p className="pt-1 text-xs text-muted-foreground">{t("effects")}</p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={freeze.isPending}>
          {tCommon("close")}
        </Button>
        <Button type="submit" disabled={freeze.isPending}>
          {freeze.isPending ? <Loader2 className="animate-spin" /> : <Snowflake />}
          {t("confirm")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function FreezeMembershipDialog({ open, onOpenChange, membership }: DialogProps) {
  const t = useTranslations("Memberships.freeze");
  const tCommon = useTranslations("Common");
  const f = useFormat();
  const allowance = membership ? freezeAllowance(membership.totalFrozenDays) : 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {membership && (
          <>
            <DialogHeader>
              <DialogTitle>{t("title", { name: isolate(membership.memberName) })}</DialogTitle>
              <DialogDescription>{t("description")}</DialogDescription>
            </DialogHeader>
            {allowance < FREEZE_RULES.minDays ? (
              <>
                <p className="rounded-lg bg-muted p-3 text-sm">
                  {t("limitReached", {
                    used: f.number(membership.totalFrozenDays),
                    total: f.number(FREEZE_RULES.maxTotalDays),
                  })}
                </p>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    {tCommon("close")}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <FreezeForm membership={membership} onDone={() => onOpenChange(false)} />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- Unfreeze ----------

export function UnfreezeMembershipDialog(props: DialogProps) {
  // A new key each time it opens remounts the inner dialog, so it reads the clock again.
  return <UnfreezeConfirm key={`${props.membership?.id ?? 0}-${props.open}`} {...props} />;
}

function UnfreezeConfirm({ open, onOpenChange, membership }: DialogProps) {
  const t = useTranslations("Memberships.unfreeze");
  const f = useFormat();
  const unfreeze = useUnfreezeMembership();
  const [now] = useState(() => Date.now());
  // A started day counts as used, so only whole days left are given back (same rule as the API).
  const unused = membership?.frozenUntil
    ? Math.max(0, Math.floor((new Date(membership.frozenUntil).getTime() - now) / DAY_MS))
    : 0;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={membership ? t("title", { name: isolate(membership.memberName) }) : t("confirm")}
      description={
        membership ? (
          <span className="block space-y-2">
            <span className="block">
              {t("body", { name: isolate(firstName(membership.memberName)) })}
            </span>
            <span className="block">
              {unused > 0
                ? t("daysBack", {
                    count: unused,
                    end: f.date(addDaysTo(membership.endDate, -unused)),
                    oldEnd: f.date(membership.endDate),
                  })
                : t("noDaysBack")}
            </span>
          </span>
        ) : (
          ""
        )
      }
      confirmLabel={t("confirm")}
      // "Cancel" next to "Unfreeze" reads badly in Arabic (both start with "إلغاء").
      cancelLabel={t("keep")}
      pending={unfreeze.isPending}
      onConfirm={() => {
        if (!membership) return;
        unfreeze.mutate(membership.id, {
          onSuccess: (saved) =>
            toast.success(t("done", { name: isolate(saved.memberName) }), {
              description: t("doneBody", { end: f.date(saved.endDate) }),
            }),
          onError: (error) => toastError(t("error"), error),
          onSettled: () => onOpenChange(false),
        });
      }}
    />
  );
}

// ---------- Cancel ----------

function CancelForm({
  membership,
  onDone,
}: {
  membership: MembershipResponse;
  onDone: () => void;
}) {
  const t = useTranslations("Memberships.cancel");
  const tForm = useTranslations("Memberships.form");
  const tErrors = useTranslations("Memberships.errors");
  const tEnums = useTranslations("Enums.PaymentMethod");
  const f = useFormat();
  const cancel = useCancelMembership();
  const {
    control,
    handleSubmit,
    register,
    setError,
    setValue,
    formState: { errors },
  } = useForm<CancelMembershipValues>({
    resolver: zodResolver(
      cancelMembershipSchema(tErrors, membership.pricePaid, f.money(membership.pricePaid)),
    ),
    defaultValues: { refundAmount: "", refundMethod: "", reason: "" },
  });
  const refundText = useWatch({ control, name: "refundAmount" });
  const refund = Number(refundText) || 0;

  const onSubmit = async (values: CancelMembershipValues) => {
    const amount = Number(values.refundAmount) || 0;
    try {
      const saved = await cancel.mutateAsync({
        id: membership.id,
        body: {
          refundAmount: amount > 0 ? amount : null,
          refundMethod: amount > 0 ? (values.refundMethod as PaymentMethod) : null,
          reason: values.reason || null,
        },
      });
      toast.success(t("done", { name: isolate(saved.memberName) }), {
        description:
          amount > 0
            ? t("doneRefund", {
                amount: f.money(amount),
                method: tEnums(values.refundMethod as PaymentMethod),
              })
            : t("doneNoRefund"),
      });
      onDone();
    } catch (error) {
      applyServerErrors(error, setError, ["refundAmount", "refundMethod", "reason"], {
        codes: { "Membership.RefundTooHigh": "refundAmount" },
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      <FormError message={errors.root?.server?.message} />
      <FormField
        id="cancel-refund"
        label={t("refund")}
        error={errors.refundAmount?.message}
        description={t("refundHint", { amount: f.money(membership.pricePaid) })}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            {...fieldProps("cancel-refund", errors.refundAmount?.message, true)}
            inputMode="decimal"
            placeholder="0"
            maxLength={9}
            className="w-32"
            {...register("refundAmount")}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setValue("refundAmount", String(membership.pricePaid), { shouldValidate: true })
            }
          >
            {t("fullRefund")}
          </Button>
        </div>
      </FormField>
      {refund > 0 && (
        <FormField id="cancel-method" label={t("refundedBy")} error={errors.refundMethod?.message}>
          <Controller
            control={control}
            name="refundMethod"
            render={({ field }) => (
              <PaymentMethodPicker
                id="cancel-method"
                value={field.value as PaymentMethod | ""}
                onChange={field.onChange}
                invalid={Boolean(errors.refundMethod)}
              />
            )}
          />
        </FormField>
      )}
      <FormField
        id="cancel-membership-reason"
        label={tForm("reason")}
        error={errors.reason?.message}
      >
        <Textarea
          {...fieldProps("cancel-membership-reason", errors.reason?.message)}
          rows={2}
          maxLength={200}
          dir="auto"
          placeholder={t("reasonPlaceholder")}
          {...register("reason")}
        />
      </FormField>
      <p className="rounded-lg bg-destructive/5 p-3 text-xs text-muted-foreground">
        {t("warning")}
      </p>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={cancel.isPending}>
          {t("keep")}
        </Button>
        <Button type="submit" variant="destructive" disabled={cancel.isPending}>
          {cancel.isPending && <Loader2 className="animate-spin" />}
          {refund > 0 ? t("confirmRefund", { amount: f.money(refund) }) : t("confirm")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CancelMembershipDialog({ open, onOpenChange, membership }: DialogProps) {
  const t = useTranslations("Memberships.cancel");
  const f = useFormat();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {membership && (
          <>
            <DialogHeader>
              <DialogTitle>{t("title", { name: isolate(membership.memberName) })}</DialogTitle>
              <DialogDescription>
                {t("description", {
                  plan: isolate(membership.planName),
                  start: f.date(membership.startDate),
                  end: f.date(membership.endDate),
                })}
              </DialogDescription>
            </DialogHeader>
            <CancelForm membership={membership} onDone={() => onOpenChange(false)} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
