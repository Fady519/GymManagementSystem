"use client";

import { useState } from "react";
import { Check, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { MemberStateBadge } from "@/features/members/components/member-state-badge";
import { isolate } from "@/lib/bidi";
import { useMembers } from "@/features/members/queries";
import { PAYMENT_METHODS } from "@/features/payments/payment-meta";
import { usePlans } from "@/features/plans/queries";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useFormat } from "@/hooks/use-format";
import { monthlyPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MemberListItem, PaymentMethod, PlanResponse } from "@/types";

/** Four big buttons instead of a dropdown: one tap at the reception desk. */
export function PaymentMethodPicker({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: PaymentMethod | "" | undefined;
  onChange: (value: PaymentMethod) => void;
  invalid?: boolean;
}) {
  const tEnums = useTranslations("Enums.PaymentMethod");
  return (
    <div
      id={id}
      role="radiogroup"
      aria-invalid={invalid || undefined}
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {PAYMENT_METHODS.map((method) => {
        const selected = value === method.value;
        return (
          <button
            key={method.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(method.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition-colors",
              selected ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
              invalid && !value && "border-destructive/50",
            )}
          >
            <method.icon className="size-4" />
            {tEnums(method.value)}
          </button>
        );
      })}
    </div>
  );
}

/** The plans on sale as selectable cards, with the monthly price to compare them. */
export function PlanPicker({
  id,
  value,
  onChange,
  invalid,
  currentPlanId,
}: {
  id: string;
  value: string;
  onChange: (planId: string, plan: PlanResponse) => void;
  invalid?: boolean;
  /** Marks the member's current plan (when renewing). */
  currentPlanId?: number;
}) {
  const t = useTranslations("Memberships.pickers");
  const f = useFormat();
  const plans = usePlans(true);

  if (plans.isPending) {
    return (
      <div className="grid gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (plans.isError || plans.data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        {plans.isError ? t("plansError") : t("noPlans")}
      </p>
    );
  }

  return (
    <div id={id} role="radiogroup" aria-invalid={invalid || undefined} className="grid gap-2">
      {plans.data.map((plan) => {
        const selected = value === String(plan.id);
        return (
          <button
            key={plan.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(String(plan.id), plan)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg border p-3 text-start transition-colors",
              selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/60",
              invalid && !value && "border-destructive/50",
            )}
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {/* The plan name is shown exactly as the admin typed it. */}
                <bdi>{plan.name}</bdi>
                {plan.id === currentPlanId && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {t("currentPlan")}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {f.duration(plan.durationDays)}
                {plan.durationDays > 30 &&
                  ` · ${t("perMonth", { price: f.money(monthlyPrice(plan.price, plan.durationDays)) })}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tabular-nums">{f.money(plan.price)}</span>
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border",
                  selected && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {selected && <Check className="size-3" />}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** What the forms need to know about the chosen member. */
export type PickedMember = Pick<MemberListItem, "id" | "name" | "phone" | "photoUrl">;

/**
 * Search a member by name or phone and pick one. Members with a running membership are shown
 * but can't be picked: they need a renewal, not a new membership.
 */
export function MemberPicker({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: PickedMember | null;
  onChange: (member: PickedMember | null) => void;
  invalid?: boolean;
}) {
  const t = useTranslations("Memberships.pickers");
  const f = useFormat();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 300);
  const members = useMembers({
    search: debounced,
    gender: null,
    state: null,
    sortBy: "Name",
    descending: false,
    page: 1,
    pageSize: 6,
  });

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
        <div className="flex min-w-0 items-center gap-3">
          <MemberAvatar name={value.name} photoUrl={value.photoUrl} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              <bdi>{value.name}</bdi>
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              <span dir="ltr">{value.phone}</span>
            </p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          <X /> {t("change")}
        </Button>
      </div>
    );
  }

  const items = members.data?.items ?? [];
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="ps-9"
          aria-invalid={invalid || undefined}
          autoComplete="off"
          maxLength={50}
        />
      </div>
      <div
        className={cn(
          "divide-y rounded-lg border transition-opacity",
          members.isFetching && "opacity-60",
        )}
      >
        {members.isPending ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="m-2 h-10" />)
        ) : items.length === 0 ? (
          <p className="p-3 text-center text-sm text-muted-foreground">
            {debounced ? t("noMatch", { search: isolate(debounced) }) : t("noMembers")}
          </p>
        ) : (
          items.map((member) => {
            const running =
              member.membershipState === "Active" || member.membershipState === "Frozen";
            return (
              <button
                key={member.id}
                type="button"
                disabled={running}
                onClick={() => onChange(member)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
                title={running ? t("alreadyRunning") : undefined}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <MemberAvatar
                    name={member.name}
                    photoUrl={member.photoUrl}
                    className="size-8 text-xs"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      <bdi>{member.name}</bdi>
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      <span dir="ltr">{member.phone}</span>
                    </p>
                  </div>
                </div>
                <MemberStateBadge state={member.membershipState} />
              </button>
            );
          })
        )}
      </div>
      {members.data && members.data.totalCount > items.length && (
        <p className="text-xs text-muted-foreground">
          {t("showing", {
            shown: f.number(items.length),
            total: f.number(members.data.totalCount),
          })}
        </p>
      )}
    </div>
  );
}
