"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Snowflake } from "lucide-react";
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
import { applyServerErrors } from "@/lib/form-errors";
import { formatDate, formatMoney } from "@/lib/format";
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
    resolver: zodResolver(renewSchema),
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
      toast.success("Membership renewed", {
        description: `${saved.memberName}: ${saved.planName} from ${formatDate(saved.startDate)} to ${formatDate(saved.endDate)}.`,
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
      <FormField id="renew-plan" label="Plan" error={errors.planId?.message}>
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
      <FormField id="renew-method" label="Paid by" error={errors.paymentMethod?.message}>
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
      <FormField id="renew-notes" label="Notes (optional)" error={errors.notes?.message}>
        <Input
          {...fieldProps("renew-notes", errors.notes?.message)}
          maxLength={500}
          {...register("notes")}
        />
      </FormField>
      {plan && (
        <p className="rounded-lg bg-muted/60 p-3 text-sm">
          <span className="font-semibold">{formatMoney(plan.price)}</span> ·{" "}
          {queued ? "starts when the current one ends" : "starts today"}:{" "}
          {formatDate(new Date(start))} → {formatDate(addDaysTo(start, plan.durationDays))}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={renew.isPending}>
          Close
        </Button>
        <Button type="submit" disabled={renew.isPending}>
          {renew.isPending && <Loader2 className="animate-spin" />}
          Confirm renewal
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RenewMembershipDialog({ open, onOpenChange, membership }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {membership && (
          <>
            <DialogHeader>
              <DialogTitle>Renew {membership.memberName}</DialogTitle>
              <DialogDescription>
                Current: {membership.planName}, ends {formatDate(membership.endDate)}. The new
                period is added after it, so no day is lost.
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
  const freeze = useFreezeMembership();
  const [openedAt] = useState(() => Date.now());
  const maxDays = Math.min(FREEZE_RULES.maxDays, freezeAllowance(membership.totalFrozenDays));
  const {
    control,
    handleSubmit,
    register,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FreezeValues>({
    resolver: zodResolver(freezeSchema(maxDays)),
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
      toast.success(`${saved.memberName}'s membership is frozen`, {
        description: `Paused until ${formatDate(saved.frozenUntil!)}. It now ends on ${formatDate(saved.endDate)}.`,
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
        label="How many days?"
        error={errors.days?.message}
        description={`${FREEZE_RULES.minDays}–${maxDays} days. ${freezeAllowance(membership.totalFrozenDays)} of ${FREEZE_RULES.maxTotalDays} freeze days left on this membership.`}
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
              {d} days
            </button>
          ))}
        </div>
      </FormField>
      <FormField id="freeze-reason" label="Reason (optional)" error={errors.reason?.message}>
        <Input
          {...fieldProps("freeze-reason", errors.reason?.message)}
          maxLength={200}
          placeholder="e.g. Travelling, injury, exams"
          {...register("reason")}
        />
      </FormField>

      <div className="space-y-2 rounded-xl border bg-sky-500/5 p-4">
        <Change label="Status" before="Active" after="Frozen" />
        <Change
          label="Frozen until"
          before="—"
          after={validDays ? formatDate(addDaysTo(openedAt, days)) : "—"}
        />
        <Change
          label="Ends on"
          before={formatDate(membership.endDate)}
          after={validDays ? formatDate(addDaysTo(membership.endDate, days)) : "—"}
        />
        <p className="pt-1 text-xs text-muted-foreground">
          Class bookings during the freeze are cancelled. Check-in is blocked until it ends.
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={freeze.isPending}>
          Close
        </Button>
        <Button type="submit" disabled={freeze.isPending}>
          {freeze.isPending ? <Loader2 className="animate-spin" /> : <Snowflake />}
          Freeze membership
        </Button>
      </DialogFooter>
    </form>
  );
}

export function FreezeMembershipDialog({ open, onOpenChange, membership }: DialogProps) {
  const allowance = membership ? freezeAllowance(membership.totalFrozenDays) : 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {membership && (
          <>
            <DialogHeader>
              <DialogTitle>Freeze {membership.memberName}&apos;s membership</DialogTitle>
              <DialogDescription>
                The membership pauses and its end date moves later by the same number of days.
              </DialogDescription>
            </DialogHeader>
            {allowance < FREEZE_RULES.minDays ? (
              <>
                <p className="rounded-lg bg-muted p-3 text-sm">
                  This membership already used {membership.totalFrozenDays} of its{" "}
                  {FREEZE_RULES.maxTotalDays} freeze days, so it can&apos;t be frozen again.
                </p>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Close
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
      title={`Unfreeze ${membership?.memberName ?? "membership"}?`}
      description={
        membership ? (
          <span className="block space-y-2">
            <span className="block">
              The membership becomes active right away and {membership.memberName.split(" ")[0]} can
              book and check in again.
            </span>
            <span className="block">
              {unused > 0
                ? `The ${unused} unused ${unused === 1 ? "day is" : "days are"} given back: it will end on ${formatDate(addDaysTo(membership.endDate, -unused))} instead of ${formatDate(membership.endDate)}.`
                : "All the frozen days were used, so the end date stays the same."}
            </span>
          </span>
        ) : (
          ""
        )
      }
      confirmLabel="Unfreeze now"
      pending={unfreeze.isPending}
      onConfirm={() => {
        if (!membership) return;
        unfreeze.mutate(membership.id, {
          onSuccess: (saved) =>
            toast.success(`${saved.memberName}'s membership is active again`, {
              description: `It ends on ${formatDate(saved.endDate)}.`,
            }),
          onError: (error) => toastError("Couldn't unfreeze the membership", error),
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
  const cancel = useCancelMembership();
  const {
    control,
    handleSubmit,
    register,
    setError,
    setValue,
    formState: { errors },
  } = useForm<CancelMembershipValues>({
    resolver: zodResolver(cancelMembershipSchema(membership.pricePaid)),
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
      toast.success(`${saved.memberName}'s membership was cancelled`, {
        description:
          amount > 0
            ? `${formatMoney(amount)} refunded by ${values.refundMethod}.`
            : "No refund was given.",
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
        label="Refund (optional)"
        error={errors.refundAmount?.message}
        description={`They paid ${formatMoney(membership.pricePaid)}. Leave empty for no refund.`}
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
            Full refund
          </Button>
        </div>
      </FormField>
      {refund > 0 && (
        <FormField id="cancel-method" label="Refunded by" error={errors.refundMethod?.message}>
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
        label="Reason (optional)"
        error={errors.reason?.message}
      >
        <Textarea
          {...fieldProps("cancel-membership-reason", errors.reason?.message)}
          rows={2}
          maxLength={200}
          placeholder="e.g. Moving to another city"
          {...register("reason")}
        />
      </FormField>
      <p className="rounded-lg bg-destructive/5 p-3 text-xs text-muted-foreground">
        The membership ends now. Class bookings it no longer covers are cancelled. This can&apos;t
        be undone.
      </p>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={cancel.isPending}>
          Keep it
        </Button>
        <Button type="submit" variant="destructive" disabled={cancel.isPending}>
          {cancel.isPending && <Loader2 className="animate-spin" />}
          {refund > 0 ? `Cancel and refund ${formatMoney(refund)}` : "Cancel membership"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CancelMembershipDialog({ open, onOpenChange, membership }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {membership && (
          <>
            <DialogHeader>
              <DialogTitle>Cancel {membership.memberName}&apos;s membership?</DialogTitle>
              <DialogDescription>
                {membership.planName}, {formatDate(membership.startDate)} →{" "}
                {formatDate(membership.endDate)}.
              </DialogDescription>
            </DialogHeader>
            <CancelForm membership={membership} onDone={() => onOpenChange(false)} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
