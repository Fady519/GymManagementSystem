"use client";

import { useCallback, useMemo } from "react";
import {
  CalendarDays,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Eye,
  List,
  Pencil,
  Plus,
  SearchX,
  Trash2,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, createColumns } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { RowActions, type RowAction } from "@/components/data-table/row-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { useCategories } from "@/features/categories/queries";
import { CancelSessionDialog } from "@/features/sessions/components/cancel-session-dialog";
import { CapacityMeter, SessionStateBadge } from "@/features/sessions/components/session-badges";
import {
  SessionFormSheet,
  type SessionPreset,
} from "@/features/sessions/components/session-form-sheet";
import { WeekCalendar } from "@/features/sessions/components/week-calendar";
import { useDeleteSession, useSessions } from "@/features/sessions/queries";
import { useTrainers } from "@/features/trainers/queries";
import { useDialogState } from "@/hooks/use-dialog-state";
import { useFormat } from "@/hooks/use-format";
import { pageSizeFrom, useClampPage, useListParams } from "@/hooks/use-list-params";
import { addDays, cairoToUtc, cairoToday, isPlainDate, startOfWeek } from "@/lib/cairo-time";
import { GYM_TIME_ZONE, intlLocale } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { isolate, isolateLtr } from "@/lib/bidi";
import type { SessionResponse, SessionState } from "@/types";
import { useRouter } from "@/i18n/navigation";

const col = createColumns<SessionResponse>();
const DEFAULT_PAGE_SIZE = 10;
const STATES: SessionState[] = ["Upcoming", "Ongoing", "Completed", "Cancelled"];

/** For rich messages: <bdi>name</bdi> keeps a stored name's own direction inside a translated sentence. */
const bdi = (chunks: React.ReactNode) => <bdi>{chunks}</bdi>;

/** The number shown on a state tab (one tiny request per tab: pageSize 1, we only read totalCount). */
function useStateCount(state: SessionState, trainerId: number | null, categoryId: number | null) {
  const query = useSessions({
    state,
    trainerId,
    categoryId,
    from: null,
    to: null,
    page: 1,
    pageSize: 1,
  });
  return query.data?.totalCount;
}

/** /dashboard/sessions: the timetable as a list per state, or as a weekly calendar. */
export function SessionsAdmin() {
  const t = useTranslations("Sessions");
  const tState = useTranslations("Enums.SessionState");
  const f = useFormat();
  const router = useRouter();
  const params = useListParams();
  const view = params.string("view") === "week" ? "week" : "list";
  const rawState = params.string("state");
  const state: SessionState = (STATES as string[]).includes(rawState)
    ? (rawState as SessionState)
    : "Upcoming";
  const rawWeek = params.string("week");
  const weekStart = startOfWeek(isPlainDate(rawWeek) ? rawWeek : cairoToday());
  const trainerId = params.number("trainerId", 0) || null;
  const categoryId = params.number("categoryId", 0) || null;
  const page = params.number("page", 1);
  const pageSize = pageSizeFrom(params, DEFAULT_PAGE_SIZE);

  const listQuery = useSessions(
    { state, trainerId, categoryId, from: null, to: null, page, pageSize },
    view === "list",
  );
  // The calendar asks for the whole week (all states) in one request; 100 is the API maximum.
  const weekQuery = useSessions(
    {
      state: null,
      trainerId,
      categoryId,
      from: cairoToUtc(weekStart),
      to: cairoToUtc(addDays(weekStart, 7)),
      page: 1,
      pageSize: 100,
    },
    view === "week",
  );
  const counts: Record<SessionState, number | undefined> = {
    Upcoming: useStateCount("Upcoming", trainerId, categoryId),
    Ongoing: useStateCount("Ongoing", trainerId, categoryId),
    Completed: useStateCount("Completed", trainerId, categoryId),
    Cancelled: useStateCount("Cancelled", trainerId, categoryId),
  };

  const { set: setParams } = params;
  const setPage = useCallback((next: number) => setParams({ page: next }), [setParams]);
  useClampPage(view === "list" ? listQuery.data : undefined, page, setPage);

  const categories = useCategories();
  const trainers = useTrainers({ search: "", categoryId: null, page: 1, pageSize: 100 });
  const deleteSession = useDeleteSession();
  const form = useDialogState<SessionResponse>();
  const cancelDialog = useDialogState<SessionResponse>();
  const confirmDelete = useDialogState<SessionResponse>();
  const presetDialog = useDialogState<SessionPreset>();
  const { show: showForm } = form;
  const { show: showCancel } = cancelDialog;
  const { show: showDelete } = confirmDelete;

  const openSession = useCallback(
    (session: SessionResponse) => router.push(`/dashboard/sessions/${session.id}`),
    [router],
  );

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("categoryName", {
          header: t("columns.class"),
          cell: ({ row }) => (
            <div className="min-w-48 space-y-1">
              <Badge variant="secondary">
                <bdi>{row.original.categoryName}</bdi>
              </Badge>
              <p className="line-clamp-1 text-sm font-medium">
                <bdi>{row.original.description}</bdi>
              </p>
            </div>
          ),
        }),
        col.accessor("startDate", {
          header: t("columns.when"),
          cell: ({ row }) => (
            <div className="whitespace-nowrap">
              <p className="font-medium">{f.day(row.original.startDate)}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                <span dir="ltr">
                  {f.time(row.original.startDate)} – {f.time(row.original.endDate)}
                </span>
              </p>
            </div>
          ),
        }),
        col.accessor("trainerName", {
          header: t("columns.coach"),
          meta: { className: "hidden md:table-cell" },
          cell: ({ getValue }) => <bdi>{getValue()}</bdi>,
        }),
        col.accessor("bookedCount", {
          header: t("columns.booked"),
          meta: { className: "hidden sm:table-cell" },
          cell: ({ row }) =>
            row.original.state === "Cancelled" ? (
              <span
                className="line-clamp-2 max-w-48 text-xs text-muted-foreground"
                title={row.original.cancelReason ?? ""}
              >
                {row.original.cancelReason ? <bdi>{row.original.cancelReason}</bdi> : t("noReason")}
              </span>
            ) : (
              <CapacityMeter booked={row.original.bookedCount} capacity={row.original.capacity} />
            ),
        }),
        col.accessor("state", {
          header: t("columns.status"),
          meta: { className: "hidden lg:table-cell" },
          cell: ({ getValue }) => <SessionStateBadge state={getValue()} />,
        }),
        col.display({
          id: "actions",
          header: () => <span className="sr-only">{t("columns.actions")}</span>,
          meta: { className: "w-12 text-end" },
          cell: ({ row }) => {
            const session = row.original;
            const actions: RowAction[] = [
              {
                label: session.state === "Ongoing" ? t("actions.attendance") : t("actions.open"),
                icon: Eye,
                onSelect: () => openSession(session),
              },
            ];
            if (session.state === "Upcoming") {
              actions.push(
                { label: t("actions.edit"), icon: Pencil, onSelect: () => showForm(session) },
                {
                  label: t("actions.cancel"),
                  icon: XCircle,
                  destructive: true,
                  onSelect: () => showCancel(session),
                },
              );
              if (session.bookedCount === 0) {
                actions.push({
                  label: t("actions.delete"),
                  icon: Trash2,
                  destructive: true,
                  onSelect: () => showDelete(session),
                });
              }
            }
            return (
              <RowActions
                label={t("actions.label", {
                  category: isolate(session.categoryName),
                  day: f.day(session.startDate),
                })}
                actions={actions}
              />
            );
          },
        }),
      ]),
    [t, f, openSession, showForm, showCancel, showDelete],
  );

  const filtered = Boolean(trainerId || categoryId);
  const clearFilters = () => params.set({ trainerId: null, categoryId: null });
  const weekSessions = weekQuery.data?.items;
  const weekStats = useMemo(() => {
    const live = (weekSessions ?? []).filter((s) => s.state !== "Cancelled");
    const booked = live.reduce((sum, s) => sum + s.bookedCount, 0);
    const seats = live.reduce((sum, s) => sum + s.capacity, 0);
    return {
      classes: live.length,
      booked,
      fill: seats > 0 ? Math.round((booked / seats) * 100) : 0,
      cancelled: (weekSessions?.length ?? 0) - live.length,
    };
  }, [weekSessions]);
  const toDelete = confirmDelete.item;
  const thisWeek = startOfWeek(cairoToday());

  // "10–16 Oct 2026" / "10–16 أكتوبر 2026": Intl shortens the range by itself (noon Cairo = that day).
  const weekLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(intlLocale(f.locale), {
        timeZone: GYM_TIME_ZONE,
        day: "numeric",
        month: "short",
        year: "numeric",
      }).formatRange(
        new Date(cairoToUtc(weekStart, "12:00")),
        new Date(cairoToUtc(addDays(weekStart, 6), "12:00")),
      ),
    [f.locale, weekStart],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={
          counts.Upcoming === undefined
            ? t("description")
            : counts.Ongoing
              ? t("descriptionLive", { live: counts.Ongoing, upcoming: counts.Upcoming })
              : t("descriptionUpcoming", { count: counts.Upcoming })
        }
        actions={
          <Button onClick={() => form.show(null)}>
            <Plus /> {t("schedule")}
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="inline-flex w-fit rounded-lg border bg-muted/40 p-0.5"
          role="group"
          aria-label={t("view.label")}
        >
          {(
            [
              { value: "list", label: t("view.list"), icon: List },
              { value: "week", label: t("view.week"), icon: CalendarDays },
            ] as const
          ).map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={view === option.value ? "secondary" : "ghost"}
              aria-pressed={view === option.value}
              className={view === option.value ? "bg-background shadow-xs" : ""}
              onClick={() => params.set({ view: option.value === "list" ? null : option.value })}
            >
              <option.icon /> {option.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            value={categoryId ? String(categoryId) : "all"}
            onValueChange={(value) => params.set({ categoryId: value === "all" ? null : value })}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label={t("filters.category")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
              {categories.data?.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  <bdi>{category.name}</bdi>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={trainerId ? String(trainerId) : "all"}
            onValueChange={(value) => params.set({ trainerId: value === "all" ? null : value })}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label={t("filters.trainer")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allTrainers")}</SelectItem>
              {trainers.data?.items.map((trainer) => (
                <SelectItem key={trainer.id} value={String(trainer.id)}>
                  <bdi>{trainer.name}</bdi>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtered && (
            <Button variant="ghost" onClick={clearFilters}>
              {t("filters.clear")}
            </Button>
          )}
        </div>
      </div>

      {view === "week" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label={t("week.previous")}
                onClick={() => params.set({ week: addDays(weekStart, -7) })}
              >
                <ChevronLeft className="rtl:rotate-180" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label={t("week.next")}
                onClick={() => params.set({ week: addDays(weekStart, 7) })}
              >
                <ChevronRight className="rtl:rotate-180" />
              </Button>
              <h2 className="ms-1 text-lg font-semibold">{weekLabel}</h2>
              {weekStart !== thisWeek && (
                <Button variant="ghost" size="sm" onClick={() => params.set({ week: null })}>
                  {t("week.thisWeek")}
                </Button>
              )}
            </div>
            {weekQuery.data && (
              <p className="text-sm text-muted-foreground">
                {t("week.stats", {
                  classes: weekStats.classes,
                  booked: weekStats.booked,
                  // "31%" as one LTR piece, or Arabic text shows it as "%31".
                  fill: isolateLtr(`${f.number(weekStats.fill)}%`),
                })}
                {weekStats.cancelled > 0 &&
                  ` · ${t("week.cancelled", { count: weekStats.cancelled })}`}
              </p>
            )}
          </div>

          {weekQuery.isError ? (
            <QueryError
              title={t("week.loadError")}
              error={weekQuery.error}
              onRetry={() => void weekQuery.refetch()}
              retrying={weekQuery.isFetching}
            />
          ) : (
            <WeekCalendar
              weekStart={weekStart}
              sessions={weekSessions}
              isPending={
                weekQuery.isPending || (weekQuery.isFetching && weekQuery.isPlaceholderData)
              }
              onSessionClick={openSession}
              onSlotClick={(date, time) => presetDialog.show({ date, startTime: time })}
            />
          )}
          <p className="hidden text-xs text-muted-foreground md:block">{t("week.tip")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Tabs
            value={state}
            onValueChange={(value) => params.set({ state: value === "Upcoming" ? null : value })}
          >
            <TabsList className="h-auto! flex-wrap">
              {STATES.map((value) => (
                <TabsTrigger key={value} value={value} className="gap-2">
                  {tState(value)}
                  {counts[value] !== undefined && (
                    <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground tabular-nums">
                      {f.number(counts[value])}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {listQuery.isError ? (
            <QueryError
              title={t("loadError")}
              error={listQuery.error}
              onRetry={() => void listQuery.refetch()}
              retrying={listQuery.isFetching}
            />
          ) : (
            <DataTable
              label={t("tableLabel", { state })}
              columns={columns}
              data={listQuery.data?.items}
              getRowId={(s) => String(s.id)}
              isPending={listQuery.isPending}
              isFetching={listQuery.isFetching}
              skeletonRows={pageSize > 10 ? 10 : pageSize}
              onRowClick={openSession}
              emptyState={
                filtered ? (
                  <EmptyState
                    icon={SearchX}
                    title={t("empty.filteredTitle")}
                    description={t("empty.filtered")}
                    action={
                      <Button variant="outline" onClick={clearFilters}>
                        {t("filters.clear")}
                      </Button>
                    }
                  />
                ) : state === "Upcoming" ? (
                  <EmptyState
                    icon={CalendarDays}
                    title={t("empty.upcomingTitle")}
                    description={t("empty.upcoming")}
                    action={
                      <Button onClick={() => form.show(null)}>
                        <Plus /> {t("scheduleFirst")}
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={CalendarOff}
                    title={
                      state === "Ongoing"
                        ? t("empty.ongoingTitle")
                        : state === "Completed"
                          ? t("empty.completedTitle")
                          : t("empty.cancelledTitle")
                    }
                    description={
                      state === "Ongoing"
                        ? t("empty.ongoing")
                        : state === "Completed"
                          ? t("empty.completed")
                          : t("empty.cancelled")
                    }
                  />
                )
              }
              footer={
                listQuery.data && (
                  <DataTablePagination
                    page={listQuery.data.page}
                    pageSize={listQuery.data.pageSize}
                    totalCount={listQuery.data.totalCount}
                    totalPages={listQuery.data.totalPages}
                    itemLabel={t("itemLabel")}
                    onPageChange={setPage}
                    onPageSizeChange={(size) =>
                      params.set({ pageSize: size === DEFAULT_PAGE_SIZE ? null : size })
                    }
                  />
                )
              }
            />
          )}
        </div>
      )}

      <SessionFormSheet open={form.open} onOpenChange={form.setOpen} session={form.item} />
      <SessionFormSheet
        open={presetDialog.open}
        onOpenChange={presetDialog.setOpen}
        session={null}
        preset={presetDialog.item}
      />
      <CancelSessionDialog
        open={cancelDialog.open}
        onOpenChange={cancelDialog.setOpen}
        session={cancelDialog.item}
      />
      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={confirmDelete.setOpen}
        title={t("delete.title")}
        description={
          toDelete
            ? t.rich("delete.descriptionFull", {
                category: toDelete.categoryName,
                trainer: toDelete.trainerName,
                day: f.day(toDelete.startDate),
                time: f.time(toDelete.startDate),
                bdi,
              })
            : ""
        }
        confirmLabel={t("actions.delete")}
        destructive
        pending={deleteSession.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          deleteSession.mutate(toDelete.id, {
            onSuccess: () => toast.success(t("delete.done")),
            onError: (error) => toastError(t("delete.failed"), error),
            onSettled: () => confirmDelete.setOpen(false),
          });
        }}
      />
    </div>
  );
}
