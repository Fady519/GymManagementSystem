"use client";

import { useMemo } from "react";
import { BadgePercent, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, createColumns } from "@/components/data-table/data-table";
import { RowActions } from "@/components/data-table/row-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { PlanFormSheet } from "@/features/plans/components/plan-form-sheet";
import { useDeletePlan, usePlans, useSetPlanStatus } from "@/features/plans/queries";
import { useDialogState } from "@/hooks/use-dialog-state";
import { useListParams } from "@/hooks/use-list-params";
import { formatDuration, formatMoney, monthlyPrice } from "@/lib/format";
import { toastError } from "@/lib/notify";
import type { PlanResponse } from "@/types";

const col = createColumns<PlanResponse>();

type StatusFilter = "all" | "active" | "inactive";
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "On sale" },
  { value: "inactive", label: "Hidden" },
];

/**
 * The admin plans page. A gym has a handful of plans, so we load them all in one request and
 * filter in the browser (that also gives us the counts on the tabs). Lists that can grow
 * large (members, trainers) are filtered and paged by the API instead.
 */
export function PlansAdmin() {
  const params = useListParams();
  const rawStatus = params.string("status");
  // Anything else typed into the URL falls back to "all".
  const status: StatusFilter =
    rawStatus === "active" || rawStatus === "inactive" ? rawStatus : "all";

  const plans = usePlans();
  const setStatus = useSetPlanStatus();
  const deletePlan = useDeletePlan();
  const form = useDialogState<PlanResponse>();
  const confirmDelete = useDialogState<PlanResponse>();

  const all = plans.data;
  const counts = {
    all: all?.length ?? 0,
    active: all?.filter((p) => p.isActive).length ?? 0,
    inactive: all?.filter((p) => !p.isActive).length ?? 0,
  };
  const visible = useMemo(
    () =>
      all?.filter((p) =>
        status === "active" ? p.isActive : status === "inactive" ? !p.isActive : true,
      ),
    [all, status],
  );

  const cheapestMonthly = all
    ?.filter((p) => p.isActive)
    .reduce<number | null>((min, p) => {
      const perMonth = monthlyPrice(p.price, p.durationDays);
      return min === null || perMonth < min ? perMonth : min;
    }, null);

  const { mutate: changeStatus, isPending: statusPending, variables: statusVars } = setStatus;
  const { show: showForm } = form;
  const { show: showDelete } = confirmDelete;

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("name", {
          header: "Plan",
          cell: ({ row }) => (
            <div className="max-w-md min-w-48">
              <p className="font-medium">{row.original.name}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {row.original.description}
              </p>
            </div>
          ),
        }),
        col.accessor("durationDays", {
          header: "Duration",
          cell: ({ getValue }) => formatDuration(getValue()),
        }),
        col.accessor("price", {
          header: "Price",
          cell: ({ getValue }) => (
            <span className="font-semibold tabular-nums">{formatMoney(getValue())}</span>
          ),
        }),
        col.display({
          id: "perMonth",
          header: "Per month",
          meta: { className: "hidden md:table-cell" },
          cell: ({ row }) => (
            <span className="text-muted-foreground tabular-nums">
              {formatMoney(monthlyPrice(row.original.price, row.original.durationDays))}
            </span>
          ),
        }),
        col.accessor("isActive", {
          header: "On sale",
          cell: ({ row }) => {
            const plan = row.original;
            const busy = statusPending && statusVars?.id === plan.id;
            return (
              <div className="flex items-center gap-2">
                <Switch
                  checked={plan.isActive}
                  disabled={busy}
                  aria-label={`${plan.name} on sale`}
                  onCheckedChange={(isActive) =>
                    changeStatus(
                      { id: plan.id, isActive },
                      {
                        onSuccess: (saved) =>
                          toast.success(
                            saved.isActive
                              ? `${saved.name} is on sale again`
                              : `${saved.name} is hidden from sale`,
                            {
                              description: saved.isActive
                                ? "Reception can sell it and visitors see it on the website."
                                : "Current members keep their memberships until they end.",
                            },
                          ),
                        onError: (error) => toastError("Couldn't change the plan status", error),
                      },
                    )
                  }
                />
                <span className="hidden text-xs text-muted-foreground lg:inline">
                  {plan.isActive ? "On sale" : "Hidden"}
                </span>
              </div>
            );
          },
        }),
        col.display({
          id: "actions",
          header: () => <span className="sr-only">Actions</span>,
          meta: { className: "w-12 text-end" },
          cell: ({ row }) => (
            <RowActions
              label={`Actions for ${row.original.name}`}
              actions={[
                { label: "Edit plan", icon: Pencil, onSelect: () => showForm(row.original) },
                {
                  label: "Delete plan",
                  icon: Trash2,
                  destructive: true,
                  onSelect: () => showDelete(row.original),
                },
              ]}
            />
          ),
        }),
      ]),
    [changeStatus, statusPending, statusVars, showForm, showDelete],
  );

  const toDelete = confirmDelete.item;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Membership plans"
        description={
          all
            ? counts.active > 0
              ? `${counts.active} of ${counts.all} plans on sale, from ${formatMoney(cheapestMonthly ?? 0)} per month.`
              : "No plan is on sale right now. Add one or turn an existing plan back on."
            : "Set the prices and durations members can buy."
        }
        actions={
          <Button onClick={() => form.show(null)}>
            <Plus /> New plan
          </Button>
        }
      />

      <Tabs
        value={status}
        onValueChange={(value) => params.set({ status: value === "all" ? null : value })}
      >
        <TabsList>
          {STATUS_FILTERS.map((filter) => (
            <TabsTrigger key={filter.value} value={filter.value}>
              {filter.label}
              <span className="ms-1.5 rounded-full bg-background/60 px-1.5 text-xs text-muted-foreground tabular-nums">
                {counts[filter.value]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {plans.isError ? (
        <QueryError
          title="We couldn't load the plans"
          error={plans.error}
          onRetry={() => void plans.refetch()}
          retrying={plans.isFetching}
        />
      ) : (
        <DataTable
          label="Membership plans"
          columns={columns}
          data={visible}
          getRowId={(plan) => String(plan.id)}
          isPending={plans.isPending}
          isFetching={plans.isFetching}
          skeletonRows={4}
          onRowClick={(plan) => form.show(plan)}
          emptyState={
            counts.all === 0 ? (
              <EmptyState
                icon={BadgePercent}
                title="No plans yet"
                description="Plans are what members buy: a duration and a price. Create the first one to start selling memberships."
                action={
                  <Button onClick={() => form.show(null)}>
                    <Plus /> Create the first plan
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={BadgePercent}
                title={status === "active" ? "No plan is on sale" : "No hidden plans"}
                description={
                  status === "active"
                    ? "Every plan is hidden right now, so nothing can be sold. Turn one back on."
                    : "Every plan is on sale. Switch a plan off to stop selling it without deleting it."
                }
                action={
                  <Button variant="outline" onClick={() => params.set({ status: null })}>
                    Show all plans
                  </Button>
                }
              />
            )
          }
        />
      )}

      <PlanFormSheet open={form.open} onOpenChange={form.setOpen} plan={form.item} />

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={confirmDelete.setOpen}
        title={`Delete ${toDelete?.name ?? "plan"}?`}
        description="The plan disappears from the list and can't be sold anymore. Members who already bought it keep their memberships and payment history. If people still have active memberships on it, hide it instead."
        confirmLabel="Delete plan"
        destructive
        pending={deletePlan.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          deletePlan.mutate(toDelete.id, {
            onSuccess: () => toast.success(`${toDelete.name} was deleted`),
            onError: (error) => toastError(`Couldn't delete ${toDelete.name}`, error),
            onSettled: () => confirmDelete.setOpen(false),
          });
        }}
      />
    </div>
  );
}
