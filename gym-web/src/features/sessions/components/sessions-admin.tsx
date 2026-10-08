"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { pageSizeFrom, useClampPage, useListParams } from "@/hooks/use-list-params";
import {
  addDays,
  cairoToUtc,
  cairoToday,
  formatWeekRange,
  isPlainDate,
  startOfWeek,
} from "@/lib/cairo-time";
import { formatDay, formatTime } from "@/lib/format";
import { toastError } from "@/lib/notify";
import type { SessionResponse, SessionState } from "@/types";

const col = createColumns<SessionResponse>();
const DEFAULT_PAGE_SIZE = 10;
const STATES: SessionState[] = ["Upcoming", "Ongoing", "Completed", "Cancelled"];
const STATE_TAB_LABEL: Record<SessionState, string> = {
  Upcoming: "Upcoming",
  Ongoing: "Live now",
  Completed: "Completed",
  Cancelled: "Cancelled",
};

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
          header: "Class",
          cell: ({ row }) => (
            <div className="min-w-48 space-y-1">
              <Badge variant="secondary">{row.original.categoryName}</Badge>
              <p className="line-clamp-1 text-sm font-medium">{row.original.description}</p>
            </div>
          ),
        }),
        col.accessor("startDate", {
          header: "When",
          cell: ({ row }) => (
            <div className="whitespace-nowrap">
              <p className="font-medium">{formatDay(row.original.startDate)}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatTime(row.original.startDate)} – {formatTime(row.original.endDate)}
              </p>
            </div>
          ),
        }),
        col.accessor("trainerName", {
          header: "Coach",
          meta: { className: "hidden md:table-cell" },
        }),
        col.accessor("bookedCount", {
          header: "Booked",
          meta: { className: "hidden sm:table-cell" },
          cell: ({ row }) =>
            row.original.state === "Cancelled" ? (
              <span
                className="line-clamp-2 max-w-48 text-xs text-muted-foreground"
                title={row.original.cancelReason ?? ""}
              >
                {row.original.cancelReason ?? "No reason recorded"}
              </span>
            ) : (
              <CapacityMeter booked={row.original.bookedCount} capacity={row.original.capacity} />
            ),
        }),
        col.accessor("state", {
          header: "Status",
          meta: { className: "hidden lg:table-cell" },
          cell: ({ getValue }) => <SessionStateBadge state={getValue()} />,
        }),
        col.display({
          id: "actions",
          header: () => <span className="sr-only">Actions</span>,
          meta: { className: "w-12 text-end" },
          cell: ({ row }) => {
            const session = row.original;
            const actions: RowAction[] = [
              {
                label: session.state === "Ongoing" ? "Take attendance" : "Open class",
                icon: Eye,
                onSelect: () => openSession(session),
              },
            ];
            if (session.state === "Upcoming") {
              actions.push(
                { label: "Edit class", icon: Pencil, onSelect: () => showForm(session) },
                {
                  label: "Cancel class",
                  icon: XCircle,
                  destructive: true,
                  onSelect: () => showCancel(session),
                },
              );
              if (session.bookedCount === 0) {
                actions.push({
                  label: "Delete class",
                  icon: Trash2,
                  destructive: true,
                  onSelect: () => showDelete(session),
                });
              }
            }
            return (
              <RowActions
                label={`Actions for ${session.categoryName} on ${formatDay(session.startDate)}`}
                actions={actions}
              />
            );
          },
        }),
      ]),
    [openSession, showForm, showCancel, showDelete],
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        description={
          counts.Upcoming === undefined
            ? "Plan the timetable, fill the spots and take attendance."
            : counts.Ongoing
              ? `${counts.Ongoing} running right now · ${counts.Upcoming} coming up.`
              : `${counts.Upcoming} upcoming ${counts.Upcoming === 1 ? "class" : "classes"} on the timetable.`
        }
        actions={
          <Button onClick={() => form.show(null)}>
            <Plus /> Schedule class
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="inline-flex w-fit rounded-lg border bg-muted/40 p-0.5"
          role="group"
          aria-label="View"
        >
          {(
            [
              { value: "list", label: "List", icon: List },
              { value: "week", label: "Week", icon: CalendarDays },
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
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by class type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All class types</SelectItem>
              {categories.data?.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={trainerId ? String(trainerId) : "all"}
            onValueChange={(value) => params.set({ trainerId: value === "all" ? null : value })}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by coach">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All coaches</SelectItem>
              {trainers.data?.items.map((trainer) => (
                <SelectItem key={trainer.id} value={String(trainer.id)}>
                  {trainer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtered && (
            <Button variant="ghost" onClick={clearFilters}>
              Clear filters
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
                aria-label="Previous week"
                onClick={() => params.set({ week: addDays(weekStart, -7) })}
              >
                <ChevronLeft className="rtl:rotate-180" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next week"
                onClick={() => params.set({ week: addDays(weekStart, 7) })}
              >
                <ChevronRight className="rtl:rotate-180" />
              </Button>
              <h2 className="ms-1 text-lg font-semibold">{formatWeekRange(weekStart)}</h2>
              {weekStart !== thisWeek && (
                <Button variant="ghost" size="sm" onClick={() => params.set({ week: null })}>
                  This week
                </Button>
              )}
            </div>
            {weekQuery.data && (
              <p className="text-sm text-muted-foreground">
                {weekStats.classes} {weekStats.classes === 1 ? "class" : "classes"} ·{" "}
                {weekStats.booked} bookings · {weekStats.fill}% full
                {weekStats.cancelled > 0 && ` · ${weekStats.cancelled} cancelled`}
              </p>
            )}
          </div>

          {weekQuery.isError ? (
            <QueryError
              title="We couldn't load this week"
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
          <p className="hidden text-xs text-muted-foreground md:block">
            Tip: click an empty slot to schedule a class at that time. Times are Cairo time.
          </p>
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
                  {STATE_TAB_LABEL[value]}
                  {counts[value] !== undefined && (
                    <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground tabular-nums">
                      {counts[value]}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {listQuery.isError ? (
            <QueryError
              title="We couldn't load the classes"
              error={listQuery.error}
              onRetry={() => void listQuery.refetch()}
              retrying={listQuery.isFetching}
            />
          ) : (
            <DataTable
              label={`${STATE_TAB_LABEL[state]} classes`}
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
                    title="No classes match"
                    description="No class of this type or coach is in this list. Try another tab or clear the filters."
                    action={
                      <Button variant="outline" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    }
                  />
                ) : state === "Upcoming" ? (
                  <EmptyState
                    icon={CalendarDays}
                    title="Nothing on the timetable"
                    description="Schedule the next classes so members can start booking their spots."
                    action={
                      <Button onClick={() => form.show(null)}>
                        <Plus /> Schedule a class
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={CalendarOff}
                    title={
                      state === "Ongoing"
                        ? "No class is running right now"
                        : state === "Completed"
                          ? "No finished classes yet"
                          : "No cancelled classes"
                    }
                    description={
                      state === "Ongoing"
                        ? "When a class starts it shows up here, so you can take attendance."
                        : state === "Completed"
                          ? "Past classes and their attendance will be listed here."
                          : "Good news: every class went ahead as planned."
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
                    itemLabel="classes"
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
        title="Delete this class?"
        description={
          toDelete
            ? `${toDelete.categoryName} with ${toDelete.trainerName} on ${formatDay(toDelete.startDate)} at ${formatTime(toDelete.startDate)} is removed from the timetable. Nobody booked it, so nobody is notified.`
            : ""
        }
        confirmLabel="Delete class"
        destructive
        pending={deleteSession.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          deleteSession.mutate(toDelete.id, {
            onSuccess: () => toast.success("Class deleted"),
            onError: (error) => toastError("Couldn't delete the class", error),
            onSettled: () => confirmDelete.setOpen(false),
          });
        }}
      />
    </div>
  );
}
