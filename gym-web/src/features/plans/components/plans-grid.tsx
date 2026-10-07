"use client";

import { Check, RefreshCw, ServerCrash } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlans } from "@/features/plans/queries";
import { formatMoney } from "@/lib/format";

/**
 * Active plans from GET /api/plans, with the three states every data component has:
 * loading (skeletons), error (message + retry) and success (the cards).
 */
export function PlansGrid() {
  const { data: plans, isPending, isError, error, refetch, isFetching } = usePlans(true);

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <ServerCrash />
        <AlertTitle>Couldn&apos;t load the plans</AlertTitle>
        <AlertDescription>
          <p>{error.message}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
            <RefreshCw className={isFetching ? "animate-spin" : undefined} /> Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (plans.length === 0) {
    return <p className="text-muted-foreground">No plans yet.</p>;
  }

  // The most expensive plan gets the "Best value" badge (the API returns the cheapest first).
  const bestValueId = plans[plans.length - 1].id;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <Card key={plan.id} className={plan.id === bestValueId ? "ring-2 ring-primary" : undefined}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              {plan.id === bestValueId && <Badge>Best value</Badge>}
            </div>
            <CardDescription>{plan.durationDays} days</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            <p className="text-3xl font-bold">{formatMoney(plan.price)}</p>
            <p className="flex gap-2 text-muted-foreground">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              {plan.description}
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant={plan.id === bestValueId ? "default" : "outline"}>
              Choose plan
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
