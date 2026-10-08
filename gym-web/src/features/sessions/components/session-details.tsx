"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { ApiError } from "@/lib/api-error";
import { formatDateTime, formatDay, formatTime } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { SessionBookingItem, SessionResponse } from "@/types";

function DetailsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading class">
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
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 300);
  const available = useAvailableMembers(session.id, debounced);
  const book = useBookMember(session.id);
  const full = session.availableSlots <= 0;

  const onBook = (member: { id: number; name: string; phone: string }) =>
    book.mutate(member, {
      onSuccess: () =>
        toast.success(`${member.name} is booked`, {
          description: `${session.categoryName}, ${formatDay(session.startDate)} at ${formatTime(session.startDate)}.`,
        }),
      onError: (error) => toastError(`Couldn't book ${member.name}`, error),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="size-4 text-primary" /> Book a member
        </CardTitle>
        <CardDescription>
          Only members with a valid membership on this day who are free at this time are listed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {full ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            The class is full. Cancel a booking or raise the number of spots to add someone.
          </p>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or phone"
                className="ps-9"
                aria-label="Search members to book"
                maxLength={50}
              />
            </div>
            {available.isError ? (
              <QueryError
                title="We couldn't load the members"
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
                {debounced
                  ? `Nobody who can book this class matches “${debounced}”.`
                  : "Every member who can attend is already booked."}
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
                        <p className="truncate text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">{member.phone}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onBook(member)}
                      disabled={book.isPending}
                    >
                      Book
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {available.data && available.data.length >= 50 && (
              <p className="text-xs text-muted-foreground">
                Showing the first 50. Search to narrow down.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BookingsCard({ session }: { session: SessionResponse }) {
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
      onSuccess: () => toast.success(`${booking.memberName} checked in`),
      onError: (error) => toastError(`Couldn't mark ${booking.memberName} as attended`, error),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-primary" />
          {session.state === "Ongoing" || session.state === "Completed"
            ? "Attendance"
            : "Booked members"}
        </CardTitle>
        <CardDescription>
          {session.state === "Ongoing"
            ? `${attended} of ${active.length} checked in. Mark members as they arrive.`
            : session.state === "Completed"
              ? `${attended} of ${active.length} attended.`
              : session.state === "Cancelled"
                ? "Every booking was cancelled with the class."
                : `${active.length} booked. Bookings can be cancelled until the class starts.`}
        </CardDescription>
        {cancelledCount > 0 && session.state !== "Cancelled" && (
          <CardAction>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCancelled((v) => !v)}
            >
              {showCancelled ? "Hide cancelled" : `Show cancelled (${cancelledCount})`}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {bookings.isError ? (
          <QueryError
            title="We couldn't load the bookings"
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
            title={session.state === "Cancelled" ? "No bookings" : "Nobody booked yet"}
            description={
              session.state === "Upcoming"
                ? "Book members from the panel, or share the timetable so they book online."
                : "This class had no bookings."
            }
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
                        {booking.memberName}
                      </Link>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {booking.memberPhone} · booked{" "}
                        {pending ? "just now" : formatDateTime(booking.bookedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pending ? (
                      <Badge variant="outline" className="gap-1">
                        <Loader2 className="animate-spin" /> Booking…
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
                        <Check /> Check in
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
                        Cancel
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
        title={`Cancel ${toCancel?.memberName ?? "this"}'s booking?`}
        description="Their spot opens up for someone else right away. They can book again if spots are left."
        confirmLabel="Cancel booking"
        destructive
        pending={false}
        onConfirm={() => {
          if (!toCancel) return;
          // Optimistic: close at once, the seat counter already moved. A failure rolls it back.
          confirmCancel.setOpen(false);
          cancelBooking.mutate(toCancel, {
            onSuccess: () => toast.success(`${toCancel.memberName}'s booking was cancelled`),
            onError: (error) =>
              toastError(`Couldn't cancel ${toCancel.memberName}'s booking`, error),
          });
        }}
      />
    </Card>
  );
}

function SessionView({ session }: { session: SessionResponse }) {
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
          <ArrowLeft /> All classes
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{session.categoryName}</Badge>
              <SessionStateBadge state={session.state} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight break-words">{session.description}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="size-4" /> {formatDay(session.startDate)}
              </span>
              <span className="flex items-center gap-1.5 tabular-nums">
                <Clock className="size-4" /> {formatTime(session.startDate)} –{" "}
                {formatTime(session.endDate)} ({formatMinutes(minutes)})
              </span>
              <span className="flex items-center gap-1.5">
                <UserRound className="size-4" /> Coach {session.trainerName}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {session.state !== "Cancelled" && (
              <div className="w-full rounded-xl border bg-muted/30 p-4 sm:w-56">
                <p className="mb-2 text-xs text-muted-foreground">Spots</p>
                <CapacityMeter booked={session.bookedCount} capacity={session.capacity} />
              </div>
            )}
            {upcoming && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => edit.show(session)}>
                  <Pencil /> Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="More actions">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-48">
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => cancelDialog.show(session)}
                    >
                      <XCircle /> Cancel class
                    </DropdownMenuItem>
                    {session.bookedCount === 0 && (
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => confirmDelete.show(session)}
                      >
                        <Trash2 /> Delete class
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
          <AlertTitle>This class was cancelled</AlertTitle>
          <AlertDescription>
            {session.cancelReason ? `Reason: ${session.cancelReason}` : "No reason was recorded."}
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
        title="Delete this class?"
        description="It is removed from the timetable. Nobody booked it, so nobody is notified."
        confirmLabel="Delete class"
        destructive
        pending={deleteSession.isPending}
        onConfirm={() =>
          deleteSession.mutate(session.id, {
            onSuccess: () => {
              toast.success("Class deleted");
              router.replace("/dashboard/sessions");
            },
            onError: (error) => {
              toastError("Couldn't delete the class", error);
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
          title="Class not found"
          description="This class doesn't exist or was deleted. Find it on the timetable instead."
          action={
            <Button asChild>
              <Link href="/dashboard/sessions">
                <ArrowLeft /> Back to classes
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
        title="We couldn't load this class"
        error={session.error}
        onRetry={() => void session.refetch()}
        retrying={session.isFetching}
      />
    );
  }

  if (session.isPending) return <DetailsSkeleton />;

  return <SessionView session={session.data} />;
}
