"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CalendarX2,
  Check,
  Clock,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryError } from "@/components/shared/query-error";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { CancelSessionDialog } from "@/features/sessions/components/cancel-session-dialog";
import {
  BookingStatusBadge,
  CapacityMeter,
  SessionStateBadge,
} from "@/features/sessions/components/session-badges";
import { SessionFormSheet } from "@/features/sessions/components/session-form-sheet";
import { formatMinutes } from "@/features/sessions/schemas";
import {
  useAttendBooking,
  useAvailableMembers,
  useBookMember,
  useCancelBooking,
  useDeleteSession,
  useSession,
  useSessionBookings,
} from "@/features/sessions/queries";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDialogState } from "@/hooks/use-dialog-state";
import { useFormat } from "@/hooks/use-format";
import { ApiError } from "@/lib/api-error";
import { toastError } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { isolate } from "@/lib/bidi";
import type { SessionBookingItem, SessionResponse } from "@/types";
import { Link, useRouter } from "@/i18n/navigation";

/** For rich messages: <bdi>name</bdi> keeps a stored name's own direction inside a translated sentence. */
const bdi = (chunks: React.ReactNode) => <bdi>{chunks}</bdi>;

function DetailsSkeleton() {
  const t = useTranslations("Sessions.details");
  return (
    <div className="space-y-6" aria-busy="true" aria-label={t("loading")}>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** The search-and-book panel. Booking updates the seat counter at once (optimistic). */
function BookMemberPanel({ session }: { session: SessionResponse }) {
  const t = useTranslations("Sessions.book");
  const f = useFormat();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 300);
  const available = useAvailableMembers(session.id, debounced);
  const book = useBookMember(session.id);
  const full = session.availableSlots <= 0;

  const onBook = (member: { id: number; name: string; phone: string }) =>
    book.mutate(member, {
      onSuccess: () =>
        toast.success(t("done", { name: isolate(member.name) }), {
          description: t("doneDescription", {
            category: isolate(session.categoryName),
            day: f.day(session.startDate),
            time: f.time(session.startDate),
          }),
        }),
      onError: (error) => toastError(t("failed", { name: isolate(member.name) }), error),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="size-4 text-primary" /> {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {full ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{t("full")}</p>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("search")}
                className="ps-9"
                aria-label={t("searchLabel")}
                maxLength={50}
              />
            </div>
            {available.isError ? (
              <QueryError
                title={t("loadError")}
                error={available.error}
                onRetry={() => void available.refetch()}
                retrying={available.isFetching}
              />
            ) : available.isPending ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : available.data.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                {debounced ? t.rich("noMatch", { query: debounced, bdi }) : t("allBooked")}
              </p>
            ) : (
              <ul
                className={cn(
                  "max-h-80 divide-y overflow-y-auto rounded-lg border transition-opacity",
                  available.isFetching && "opacity-60",
                )}
              >
                {available.data.map((member) => (
                  <li key={member.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <MemberAvatar name={member.name} photoUrl={null} className="size-8 text-xs" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          <bdi>{member.name}</bdi>
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          <span dir="ltr">{member.phone}</span>
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onBook(member)}
                      disabled={book.isPending}
                    >
                      {t("action")}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {available.data && available.data.length >= 50 && (
              <p className="text-xs text-muted-foreground">{t("firstResults", { count: 50 })}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BookingsCard({ session }: { session: SessionResponse }) {
  const t = useTranslations("Sessions.bookings");
  const tCommon = useTranslations("Common");
  const f = useFormat();
  const bookings = useSessionBookings(session.id);
  const cancelBooking = useCancelBooking(session.id);
  const attend = useAttendBooking(session.id);
  const confirmCancel = useDialogState<SessionBookingItem>();
  const [showCancelled, setShowCancelled] = useState(false);

  const list = bookings.data ?? [];
  const active = list.filter((b) => b.status !== "Cancelled");
  const cancelledCount = list.length - active.length;
  const attended = list.filter((b) => b.status === "Attended").length;
  const visible = (showCancelled ? list : active).toSorted((a, b) =>
    a.memberName.localeCompare(b.memberName),
  );
  const canCancel = session.state === "Upcoming";
  const canAttend = session.state === "Ongoing";
  const toCancel = confirmCancel.item;

  const markAttended = (booking: SessionBookingItem) =>
    attend.mutate(booking, {
      onSuccess: () => toast.success(t("checkedIn", { name: isolate(booking.memberName) })),
      onError: (error) =>
        toastError(t("checkInFailed", { name: isolate(booking.memberName) }), error),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-primary" />
          {session.state === "Ongoing" || session.state === "Completed"
            ? t("titleAttendance")
            : t("titleBooked")}
        </CardTitle>
        <CardDescription>
          {session.state === "Ongoing"
            ? t("ongoing", { attended: f.number(attended), total: f.number(active.length) })
            : session.state === "Completed"
              ? t("completed", { attended: f.number(attended), total: f.number(active.length) })
              : session.state === "Cancelled"
                ? t("cancelled")
                : t("upcoming", { count: active.length })}
        </CardDescription>
        {cancelledCount > 0 && session.state !== "Cancelled" && (
          <CardAction>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCancelled((v) => !v)}
            >
              {showCancelled
                ? t("hideCancelled")
                : t("showCancelled", { count: f.number(cancelledCount) })}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {bookings.isError ? (
          <QueryError
            title={t("loadError")}
            error={bookings.error}
            onRetry={() => void bookings.refetch()}
            retrying={bookings.isFetching}
          />
        ) : bookings.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Users}
            className="py-8"
            title={session.state === "Cancelled" ? t("emptyCancelledTitle") : t("emptyTitle")}
            description={session.state === "Upcoming" ? t("emptyUpcoming") : t("emptyPast")}
          />
        ) : (
          <ul className="divide-y">
            {visible.map((booking) => {
              const pending = booking.bookingId < 0;
              return (
                <li
                  key={booking.bookingId}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 py-3 transition-opacity",
                    (pending || booking.status === "Cancelled") && "opacity-60",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <MemberAvatar
                      name={booking.memberName}
                      photoUrl={null}
                      className="size-9 text-xs"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/members/${booking.memberId}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        <bdi>{booking.memberName}</bdi>
                      </Link>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        <span dir="ltr">{booking.memberPhone}</span> ·{" "}
                        {pending
                          ? t("bookedJustNow")
                          : t("bookedAt", { date: f.dateTime(booking.bookedAt) })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pending ? (
                      <Badge variant="outline" className="gap-1">
                        <Loader2 className="animate-spin" /> {t("booking")}
                      </Badge>
                    ) : (
                      <BookingStatusBadge
                        status={booking.status}
                        classEnded={session.state === "Completed"}
                      />
                    )}
                    {!pending && booking.status === "Booked" && canAttend && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => markAttended(booking)}
                        disabled={attend.isPending}
                      >
                        <Check /> {t("checkIn")}
                      </Button>
                    )}
                    {!pending && booking.status === "Booked" && canCancel && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => confirmCancel.show(booking)}
                      >
                        {tCommon("cancel")}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmCancel.open}
        onOpenChange={confirmCancel.setOpen}
        title={t("cancelTitle", { name: isolate(toCancel?.memberName ?? "") })}
        description={t("cancelDescription")}
        confirmLabel={t("cancelConfirm")}
        destructive
        pending={false}
        onConfirm={() => {
          if (!toCancel) return;
          // Optimistic: close at once, the seat counter already moved. A failure rolls it back.
          confirmCancel.setOpen(false);
          cancelBooking.mutate(toCancel, {
            onSuccess: () => toast.success(t("cancelDone", { name: isolate(toCancel.memberName) })),
            onError: (error) =>
              toastError(t("cancelFailed", { name: isolate(toCancel.memberName) }), error),
          });
        }}
      />
    </Card>
  );
}

function SessionView({ session }: { session: SessionResponse }) {
  const t = useTranslations("Sessions.details");
  const tSessions = useTranslations("Sessions");
  const tLength = useTranslations("Sessions.length");
  const f = useFormat();
  const router = useRouter();
  const edit = useDialogState<SessionResponse>();
  const cancelDialog = useDialogState<SessionResponse>();
  const confirmDelete = useDialogState<SessionResponse>();
  const deleteSession = useDeleteSession();
  const minutes = Math.round(
    (new Date(session.endDate).getTime() - new Date(session.startDate).getTime()) / 60_000,
  );
  const upcoming = session.state === "Upcoming";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ms-2" asChild>
        <Link href="/dashboard/sessions">
          <ArrowLeft className="rtl:rotate-180" /> {t("back")}
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                <bdi>{session.categoryName}</bdi>
              </Badge>
              <SessionStateBadge state={session.state} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight break-words">
              <bdi>{session.description}</bdi>
            </h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="size-4" /> {f.day(session.startDate)}
              </span>
              <span className="flex items-center gap-1.5 tabular-nums">
                <Clock className="size-4" />
                <span dir="ltr">
                  {f.time(session.startDate)} – {f.time(session.endDate)}
                </span>
                <span>({formatMinutes(minutes, tLength)})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <UserRound className="size-4" />
                {t.rich("coach", { name: session.trainerName, bdi })}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {session.state !== "Cancelled" && (
              <div className="w-full rounded-xl border bg-muted/30 p-4 sm:w-56">
                <p className="mb-2 text-xs text-muted-foreground">{t("spots")}</p>
                <CapacityMeter booked={session.bookedCount} capacity={session.capacity} />
              </div>
            )}
            {upcoming && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => edit.show(session)}>
                  <Pencil /> {t("edit")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label={t("more")}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-48">
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => cancelDialog.show(session)}
                    >
                      <XCircle /> {tSessions("actions.cancel")}
                    </DropdownMenuItem>
                    {session.bookedCount === 0 && (
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => confirmDelete.show(session)}
                      >
                        <Trash2 /> {tSessions("actions.delete")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {session.state === "Cancelled" && (
        <Alert variant="destructive">
          <CalendarX2 />
          <AlertTitle>{t("cancelledTitle")}</AlertTitle>
          <AlertDescription>
            {session.cancelReason
              ? t.rich("cancelReason", { reason: session.cancelReason, bdi })
              : t("noReason")}
          </AlertDescription>
        </Alert>
      )}

      <div className={cn("grid gap-6", upcoming && "lg:grid-cols-[minmax(0,1fr)_24rem]")}>
        <BookingsCard session={session} />
        {upcoming && <BookMemberPanel session={session} />}
      </div>

      <SessionFormSheet open={edit.open} onOpenChange={edit.setOpen} session={session} />
      <CancelSessionDialog
        open={cancelDialog.open}
        onOpenChange={cancelDialog.setOpen}
        session={session}
      />
      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={confirmDelete.setOpen}
        title={tSessions("delete.title")}
        description={tSessions("delete.description")}
        confirmLabel={tSessions("actions.delete")}
        destructive
        pending={deleteSession.isPending}
        onConfirm={() =>
          deleteSession.mutate(session.id, {
            onSuccess: () => {
              toast.success(tSessions("delete.done"));
              router.replace("/dashboard/sessions");
            },
            onError: (error) => {
              toastError(tSessions("delete.failed"), error);
              confirmDelete.setOpen(false);
            },
          })
        }
      />
    </div>
  );
}

/** /dashboard/sessions/[id]: one class, its bookings and attendance. */
export function SessionDetails() {
  const t = useTranslations("Sessions.details");
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const valid = Number.isInteger(sessionId) && sessionId > 0;
  const session = useSession(sessionId, valid);
  const notFound = !valid || (session.error instanceof ApiError && session.error.status === 404);

  if (notFound) {
    return (
      <Card>
        <EmptyState
          icon={CalendarX2}
          title={t("notFoundTitle")}
          description={t("notFound")}
          action={
            <Button asChild>
              <Link href="/dashboard/sessions">
                <ArrowLeft className="rtl:rotate-180" /> {t("backToClasses")}
              </Link>
            </Button>
          }
        />
      </Card>
    );
  }

  if (session.isError) {
    return (
      <QueryError
        title={t("loadError")}
        error={session.error}
        onRetry={() => void session.refetch()}
        retrying={session.isFetching}
      />
    );
  }

  if (session.isPending) return <DetailsSkeleton />;

  return <SessionView session={session.data} />;
}
