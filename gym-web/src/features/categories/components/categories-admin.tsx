"use client";

import { useMemo } from "react";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable, createColumns } from "@/components/data-table/data-table";
import { RowActions } from "@/components/data-table/row-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { CategoryFormSheet } from "@/features/categories/components/category-form-sheet";
import { useCategories, useDeleteCategory } from "@/features/categories/queries";
import { useDialogState } from "@/hooks/use-dialog-state";
import { useFormat } from "@/hooks/use-format";
import { toastError } from "@/lib/notify";
import { isolate } from "@/lib/bidi";
import type { CategoryResponse } from "@/types";
import { Link } from "@/i18n/navigation";

const col = createColumns<CategoryResponse>();

/** For rich messages: <bdi>name</bdi> keeps a stored name's own direction inside a translated sentence. */
const bdi = (chunks: React.ReactNode) => <bdi>{chunks}</bdi>;

/** The admin categories page: the types of classes the gym offers (Yoga, Boxing...). */
export function CategoriesAdmin() {
  const t = useTranslations("Categories");
  const f = useFormat();
  const categories = useCategories();
  const deleteCategory = useDeleteCategory();
  const form = useDialogState<CategoryResponse>();
  const confirmDelete = useDialogState<CategoryResponse>();
  const { show: showForm } = form;
  const { show: showDelete } = confirmDelete;

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("name", {
          header: t("columns.category"),
          cell: ({ getValue }) => (
            <span className="flex items-center gap-3 font-medium">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Tags className="size-4" />
              </span>
              <bdi>{getValue()}</bdi>
            </span>
          ),
        }),
        col.accessor("trainersCount", {
          header: t("columns.trainers"),
          cell: ({ row }) =>
            row.original.trainersCount > 0 ? (
              // Opens the trainers list already filtered to this category.
              <Link
                href={`/dashboard/trainers?categoryId=${row.original.id}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("trainerCount", { count: row.original.trainersCount })}
              </Link>
            ) : (
              <span className="text-muted-foreground">{t("noTrainers")}</span>
            ),
        }),
        col.accessor("createdAt", {
          header: t("columns.added"),
          meta: { className: "hidden sm:table-cell" },
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{f.date(getValue())}</span>
          ),
        }),
        col.display({
          id: "actions",
          header: () => <span className="sr-only">{t("columns.actions")}</span>,
          meta: { className: "w-12 text-end" },
          cell: ({ row }) => (
            <RowActions
              label={t("actions.label", { name: isolate(row.original.name) })}
              actions={[
                {
                  label: t("actions.rename"),
                  icon: Pencil,
                  onSelect: () => showForm(row.original),
                },
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
    [t, f, showForm, showDelete],
  );

  const data = categories.data;
  const totalTrainers = data?.reduce((sum, c) => sum + c.trainersCount, 0) ?? 0;
  const toDelete = confirmDelete.item;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={
          data && data.length > 0
            ? t("descriptionCount", { count: data.length, trainers: totalTrainers })
            : t("description")
        }
        actions={
          <Button onClick={() => form.show(null)}>
            <Plus /> {t("add")}
          </Button>
        }
      />

      {categories.isError ? (
        <QueryError
          title={t("loadError")}
          error={categories.error}
          onRetry={() => void categories.refetch()}
          retrying={categories.isFetching}
        />
      ) : (
        <DataTable
          label={t("title")}
          columns={columns}
          data={data}
          getRowId={(c) => String(c.id)}
          isPending={categories.isPending}
          isFetching={categories.isFetching}
          skeletonRows={5}
          onRowClick={(c) => form.show(c)}
          emptyState={
            <EmptyState
              icon={Tags}
              title={t("empty.title")}
              description={t("empty.description")}
              action={
                <Button onClick={() => form.show(null)}>
                  <Plus /> {t("empty.action")}
                </Button>
              }
            />
          }
        />
      )}

      <CategoryFormSheet open={form.open} onOpenChange={form.setOpen} category={form.item} />

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={confirmDelete.setOpen}
        title={t("delete.title", { name: isolate(toDelete?.name ?? "") })}
        description={
          toDelete && toDelete.trainersCount > 0
            ? t.rich("delete.hasTrainers", {
                count: toDelete.trainersCount,
                name: toDelete.name,
                bdi,
              })
            : t("delete.description")
        }
        confirmLabel={t("actions.delete")}
        destructive
        pending={deleteCategory.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          deleteCategory.mutate(toDelete.id, {
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
