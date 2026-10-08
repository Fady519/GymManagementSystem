"use client";

import { useMemo } from "react";
import { BadgePercent, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { useFormat } from "@/hooks/use-format";
import { useListParams } from "@/hooks/use-list-params";
import { monthlyPrice } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { isolate } from "@/lib/bidi";
import type { PlanResponse } from "@/types";

const col = createColumns<PlanResponse>();

type StatusFilter = "all" | "active" | "inactive";
const STATUS_FILTERS: StatusFilter[] = ["all", "active", "inactive"];

/**
 * The admin plans page. A gym has a handful of plans, so we load them all in one request and
 * filter in the browser (that also gives us the counts on the tabs). Lists that can grow
 * large (members, trainers) are filtered and paged by the API instead.
 */
export function PlansAdmin() {
  const t = useTranslations("Plans");
  const f = useFormat();
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
          header: t("columns.plan"),
          cell: ({ row }) => (
            <div className="max-w-md min-w-48">
              <p className="font-medium">
                <bdi>{row.original.name}</bdi>
              </p>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                <bdi>{row.original.description}</bdi>
              </p>
            </div>
          ),
        }),
        col.accessor("durationDays", {
          header: t("columns.duration"),
          cell: ({ getValue }) => f.duration(getValue()),
        }),
        col.accessor("price", {
          header: t("columns.price"),
          cell: ({ getValue }) => (
            <span className="font-semibold tabular-nums">{f.money(getValue())}</span>
          ),
        }),
        col.display({
          id: "perMonth",
          header: t("columns.perMonth"),
          meta: { className: "hidden md:table-cell" },
          cell: ({ row }) => (
            <span className="text-muted-foreground tabular-nums">
              {f.money(monthlyPrice(row.original.price, row.original.durationDays))}
            </span>
          ),
        }),
        col.accessor("isActive", {
          header: t("columns.onSale"),
          cell: ({ row }) => {
            const plan = row.original;
            const busy = statusPending && statusVars?.id === plan.id;
            return (
              <div className="flex items-center gap-2">
                <Switch
                  checked={plan.isActive}
                  disabled={busy}
                  aria-label={t("onSaleLabel", { name: isolate(plan.name) })}
                  onCheckedChange={(isActive) =>
                    changeStatus(
                      { id: plan.id, isActive },
                      {
                        onSuccess: (saved) =>
                          toast.success(
                            saved.isActive
                              ? t("status.onSale", { name: isolate(saved.name) })
                              : t("status.hidden", { name: isolate(saved.name) }),
                            {
                              description: saved.isActive
                                ? t("status.onSaleDescription")
                                : t("status.hiddenDescription"),
                            },
                          ),
                        onError: (error) => toastError(t("status.failed"), error),
                      },
                    )
                  }
                />
                <span className="hidden text-xs text-muted-foreground lg:inline">
                  {plan.isActive ? t("filters.active") : t("filters.inactive")}
                </span>
              </div>
            );
          },
        }),
        col.display({
          id: "actions",
          header: () => <span className="sr-only">{t("columns.actions")}</span>,
          meta: { className: "w-12 text-end" },
          cell: ({ row }) => (
            <RowActions
              label={t("actions.label", { name: isolate(row.original.name) })}
              actions={[
                { label: t("actions.edit"), icon: Pencil, onSelect: () => showForm(row.original) },
                {
                  label: t("actions.delete"),
                  icon: Trash2,
                  destructive: true,
                  onSelect: () => showDelete(row.original),
                },
              ]}
            />
          ),
        }),
      ]),
    [t, f, changeStatus, statusPending, statusVars, showForm, showDelete],
  );

  const toDelete = confirmDelete.item;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={
          all
            ? counts.active > 0
              ? t("descriptionOnSale", {
                  active: counts.active,
                  total: counts.all,
                  price: f.money(cheapestMonthly ?? 0),
                })
              : t("descriptionNone")
            : t("description")
        }
        actions={
          <Button onClick={() => form.show(null)}>
            <Plus /> {t("add")}
          </Button>
        }
      />

      <Tabs
        value={status}
        onValueChange={(value) => params.set({ status: value === "all" ? null : value })}
      >
        <TabsList>
          {STATUS_FILTERS.map((filter) => (
            <TabsTrigger key={filter} value={filter}>
              {t(`filters.${filter}`)}
              <span className="ms-1.5 rounded-full bg-background/60 px-1.5 text-xs text-muted-foreground tabular-nums">
                {f.number(counts[filter])}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {plans.isError ? (
        <QueryError
          title={t("loadError")}
          error={plans.error}
          onRetry={() => void plans.refetch()}
          retrying={plans.isFetching}
        />
      ) : (
        <DataTable
          label={t("title")}
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
                title={t("empty.title")}
                description={t("empty.description")}
                action={
                  <Button onClick={() => form.show(null)}>
                    <Plus /> {t("empty.action")}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={BadgePercent}
                title={status === "active" ? t("empty.activeTitle") : t("empty.inactiveTitle")}
                description={status === "active" ? t("empty.active") : t("empty.inactive")}
                action={
                  <Button variant="outline" onClick={() => params.set({ status: null })}>
                    {t("empty.showAll")}
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
        title={t("delete.title", { name: isolate(toDelete?.name ?? "") })}
        description={t("delete.description")}
        confirmLabel={t("actions.delete")}
        destructive
        pending={deletePlan.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          deletePlan.mutate(toDelete.id, {
            onSuccess: () => toast.success(t("delete.done", { name: isolate(toDelete.name) })),
            onError: (error) =>
              toastError(t("delete.failed", { name: isolate(toDelete.name) }), error),
            onSettled: () => confirmDelete.setOpen(false),
          });
        }}
      />
    </div>
  );
}
