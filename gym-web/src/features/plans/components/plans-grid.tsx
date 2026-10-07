"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/shared/query-error";
import { usePlans } from "@/features/plans/queries";
import { formatDuration, formatMoney, monthlyPrice } from "@/lib/format";

/**
 * Active plans from GET /api/plans, with the three states every data component has:
 * loading (skeletons), error (message + retry) and success (the cards).
 */
export function PlansGrid() {
  const { data: plans, isPending, isError, error, refetch, isFetching } = usePlans(true);

  if (isPending) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-60 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <QueryError
        title="We couldn't load our memberships"
        error={error}
        onRetry={refetch}
        retrying={isFetching}
      />
    );
  }

  if (plans.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
        New memberships are coming soon. Visit the front desk for current offers.
      </p>
    );
  }

  // Compare plans by their price per month: the cheapest per month is the best value,
  // and every plan shows how much it saves against the most expensive monthly rate.
  const monthly = new Map(plans.map((p) => [p.id, monthlyPrice(p.price, p.durationDays)]));
  const highestMonthly = Math.max(...monthly.values());
  const bestValue = plans.reduce((best, p) =>
    monthly.get(p.id)! < monthly.get(best.id)! ? p : best,
  );

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => {
        const perMonth = monthly.get(plan.id)!;
        const savingPercent = Math.round((1 - perMonth / highestMonthly) * 100);
        const isBest = plans.length > 1 && plan.id === bestValue.id;

        return (
          <Card
            key={plan.id}
            className={
              isBest
                ? "relative rounded-2xl shadow-lg ring-2 shadow-primary/10 ring-primary"
                : "relative rounded-2xl transition-shadow hover:shadow-md"
            }
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                {isBest && <Badge>Best value</Badge>}
              </div>
              <CardDescription>{formatDuration(plan.durationDays)} membership</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div>
                <p className="text-3xl font-bold tracking-tight">{formatMoney(plan.price)}</p>
                {plan.durationDays > 30 && (
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(perMonth)} / month
                    {savingPercent > 0 && (
                      <span className="ms-2 font-medium text-success">Save {savingPercent}%</span>
                    )}
                  </p>
                )}
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {plan.description}
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  Online class booking
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  Freeze your membership when you travel
                </li>
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
