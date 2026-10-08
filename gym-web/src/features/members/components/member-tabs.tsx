"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  HeartPulse,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Ticket,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, createColumns } from "@/components/data-table/data-table";
import { RowActions } from "@/components/data-table/row-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryError } from "@/components/shared/query-error";
import {
  useMemberBookings,
  useMemberMemberships,
  useMemberPayments,
} from "@/features/members/queries";
import { MembershipStateBadge } from "@/features/member-portal/components/membership-state-badge";
import { useMembershipActions } from "@/features/memberships/components/membership-actions";
import { SellMembershipSheet } from "@/features/memberships/components/sell-membership-sheet";
import { PAYMENT_TYPE_STYLE } from "@/features/payments/payment-meta";
import { BookingStatusBadge } from "@/features/sessions/components/session-badges";
import { useDialogState } from "@/hooks/use-dialog-state";
import {
  formatClassTime,
  formatDate,
  formatDateTime,
  formatDays,
  formatDuration,
  formatMoney,
} from "@/lib/format";
import { ageOn } from "@/lib/validation";
import { cn } from "@/lib/utils";
import type { MemberResponse, MembershipResponse, PaymentResponse } from "@/types";

/** One "label: value" line with an icon, used on the overview cards. */
function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium break-words">{children}</dd>
      </div>
    </div>
  );
}

export function OverviewTab({ member }: { member: MemberResponse }) {
  const age = ageOn(new Date(), member.dateOfBirth);
  const address = member.address;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <InfoRow icon={Mail} label="Email">
              <a href={`mailto:${member.email}`} className="hover:underline">
                {member.email}
              </a>
            </InfoRow>
            <InfoRow icon={Phone} label="Mobile">
              <a href={`tel:${member.phone}`} className="tabular-nums hover:underline">
                {member.phone}
              </a>
            </InfoRow>
            <InfoRow icon={CalendarDays} label="Date of birth">
              {formatDate(member.dateOfBirth)} · {age} years old
            </InfoRow>
            <InfoRow icon={UserRound} label="Gender">
              {member.gender}
            </InfoRow>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent>
          {address ? (
            <dl className="divide-y">
              <InfoRow icon={MapPin} label="Street">
                {address.buildingNumber} {address.street}
              </InfoRow>
              <InfoRow icon={MapPin} label="City">
                {address.city}
              </InfoRow>
            </dl>
          ) : (
            <p className="py-3 text-sm text-muted-foreground">
              No address on file. Add one with “Edit details”.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const membershipCol = createColumns<MembershipResponse>();
const membershipColumns = membershipCol.columns([
  membershipCol.accessor("planName", {
    header: "Plan",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.planName}</p>
        <p className="text-xs text-muted-foreground">{formatDuration(row.original.durationDays)}</p>
      </div>
    ),
  }),
  membershipCol.accessor("startDate", {
    header: "Period",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {formatDate(row.original.startDate)} → {formatDate(row.original.endDate)}
      </span>
    ),
  }),
  membershipCol.accessor("pricePaid", {
    header: "Paid",
    meta: { className: "hidden sm:table-cell" },
    cell: ({ getValue }) => <span className="tabular-nums">{formatMoney(getValue())}</span>,
  }),
  membershipCol.accessor("state", {
    header: "Status",
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1">
        <MembershipStateBadge state={row.original.state} />
        {row.original.frozenUntil && (
          <span className="text-xs text-muted-foreground">
            until {formatDate(row.original.frozenUntil)}
          </span>
        )}
      </div>
    ),
  }),
  membershipCol.accessor("totalFrozenDays", {
    header: "Frozen",
    meta: { className: "hidden md:table-cell" },
    cell: ({ getValue }) => (
      <span className="text-muted-foreground tabular-nums">
        {getValue() > 0 ? formatDays(getValue()) : "—"}
      </span>
    ),
  }),
]);

export function MembershipsTab({ member }: { member: MemberResponse }) {
  const memberships = useMemberMemberships(member.id);
  const actions = useMembershipActions();
  const sell = useDialogState<null>();
  const { rowActions, showDetails } = actions;
  // A member with nothing running buys a new membership; otherwise they renew the current one.
  const canBuy = member.membershipState === "None" || member.membershipState === "Expired";

  const columns = useMemo(
    () => [
      ...membershipColumns,
      membershipCol.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        meta: { className: "w-12 text-end" },
        cell: ({ row }) => (
          <RowActions
            label={`Actions for ${row.original.planName}`}
            actions={rowActions(row.original)}
          />
        ),
      }),
    ],
    [rowActions],
  );

  if (memberships.isError) {
    return (
      <QueryError
        title="We couldn't load the memberships"
        error={memberships.error}
        onRetry={() => void memberships.refetch()}
        retrying={memberships.isFetching}
      />
    );
  }

  return (
    <div className="space-y-4">
      {canBuy && (memberships.data?.items.length ?? 0) > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => sell.show(null)}>
            <Plus /> New membership
          </Button>
        </div>
      )}
      <DataTable
        label={`${member.name}'s memberships`}
        columns={columns}
        data={memberships.data?.items}
        getRowId={(m) => String(m.id)}
        isPending={memberships.isPending}
        isFetching={memberships.isFetching}
        skeletonRows={3}
        onRowClick={showDetails}
        emptyState={
          <EmptyState
            icon={Ticket}
            title="No memberships yet"
            description={`${member.name} hasn't bought a plan yet. Sell one now and they can book classes right away.`}
            action={
              <Button onClick={() => sell.show(null)}>
                <Plus /> Sell a membership
              </Button>
            }
          />
        }
      />
      <SellMembershipSheet open={sell.open} onOpenChange={sell.setOpen} presetMember={member} />
      {actions.dialogs}
    </div>
  );
}

const BOOKINGS_PAGE_SIZE = 10;

export function BookingsTab({ member }: { member: MemberResponse }) {
  const [upcoming, setUpcoming] = useState(true);
  const [page, setPage] = useState(1);
  const bookings = useMemberBookings(member.id, { upcoming, page, pageSize: BOOKINGS_PAGE_SIZE });
  // Read the clock once (not on every render) to tell finished classes apart.
  const [openedAt] = useState(() => Date.now());

  const show = (next: boolean) => {
    setUpcoming(next);
    setPage(1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Class bookings</CardTitle>
        <CardAction>
          <div
            className="inline-flex rounded-lg border bg-muted/40 p-0.5"
            role="group"
            aria-label="Which bookings"
          >
            {[
              { value: true, label: "Upcoming" },
              { value: false, label: "All history" },
            ].map((option) => (
              <Button
                key={option.label}
                type="button"
                size="sm"
                variant={upcoming === option.value ? "secondary" : "ghost"}
                aria-pressed={upcoming === option.value}
                className={upcoming === option.value ? "bg-background shadow-xs" : ""}
                onClick={() => show(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardAction>
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
        ) : bookings.data.items.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            className="py-8"
            title={upcoming ? "No upcoming classes" : "No bookings yet"}
            description={
              upcoming
                ? `${member.name} isn't booked into any class. Book them from a class page on the timetable.`
                : `${member.name} hasn't booked a class yet.`
            }
            action={
              <Button variant="outline" asChild>
                <Link href="/dashboard/sessions">Open the timetable</Link>
              </Button>
            }
          />
        ) : (
          <div className={cn("space-y-3 transition-opacity", bookings.isFetching && "opacity-60")}>
            <ul className="divide-y">
              {bookings.data.items.map((booking) => {
                const classCancelled = booking.sessionStatus === "Cancelled";
                return (
                  <li
                    key={booking.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/sessions/${booking.sessionId}`}
                        className="flex items-center gap-2 text-sm font-medium hover:underline"
                      >
                        <Badge variant="secondary">{booking.categoryName}</Badge>
                        <span className="truncate">{booking.sessionDescription}</span>
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatClassTime(booking.sessionStartDate)} · Coach {booking.trainerName}
                      </p>
                      {classCancelled && (
                        <p className="mt-1 text-xs text-destructive">
                          Class cancelled
                          {booking.sessionCancelReason ? `: ${booking.sessionCancelReason}` : ""}
                        </p>
                      )}
                    </div>
                    <BookingStatusBadge
                      status={booking.status}
                      classEnded={
                        !classCancelled && new Date(booking.sessionEndDate).getTime() <= openedAt
                      }
                    />
                  </li>
                );
              })}
            </ul>
            {bookings.data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-3 text-sm text-muted-foreground">
                <span>
                  Page {bookings.data.page} of {bookings.data.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!bookings.data.hasPreviousPage}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!bookings.data.hasNextPage}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const paymentCol = createColumns<PaymentResponse>();
const paymentColumns = paymentCol.columns([
  paymentCol.accessor("paidAt", {
    header: "Date",
    cell: ({ getValue }) => <span className="whitespace-nowrap">{formatDateTime(getValue())}</span>,
  }),
  paymentCol.accessor("planName", { header: "Plan" }),
  paymentCol.accessor("type", {
    header: "Type",
    cell: ({ getValue }) => (
      <Badge variant="outline" className={PAYMENT_TYPE_STYLE[getValue()]}>
        {getValue()}
      </Badge>
    ),
  }),
  paymentCol.accessor("method", {
    header: "Method",
    meta: { className: "hidden sm:table-cell" },
  }),
  paymentCol.accessor("amount", {
    header: "Amount",
    meta: { className: "text-end" },
    cell: ({ row }) => {
      const refund = row.original.type === "Refund";
      return (
        <span className={cn("font-semibold tabular-nums", refund && "text-destructive")}>
          {refund ? "−" : ""}
          {formatMoney(row.original.amount)}
        </span>
      );
    },
  }),
  paymentCol.accessor("receivedBy", {
    header: "Received by",
    meta: { className: "hidden lg:table-cell" },
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() ?? "—"}</span>,
  }),
]);

export function PaymentsTab({ member }: { member: MemberResponse }) {
  const payments = useMemberPayments(member.id);

  const totals = useMemo(() => {
    const list = payments.data ?? [];
    const paid = list.filter((p) => p.type !== "Refund").reduce((sum, p) => sum + p.amount, 0);
    const refunded = list.filter((p) => p.type === "Refund").reduce((sum, p) => sum + p.amount, 0);
    return { paid, refunded, net: paid - refunded };
  }, [payments.data]);

  if (payments.isError) {
    return (
      <QueryError
        title="We couldn't load the payments"
        error={payments.error}
        onRetry={() => void payments.refetch()}
        retrying={payments.isFetching}
      />
    );
  }

  return (
    <div className="space-y-4">
      {payments.data && payments.data.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Total paid", value: totals.paid },
            { label: "Refunded", value: totals.refunded },
            { label: "Net paid", value: totals.net },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{formatMoney(item.value)}</p>
            </div>
          ))}
        </div>
      )}
      <DataTable
        label={`${member.name}'s payments`}
        columns={paymentColumns}
        data={payments.data}
        getRowId={(p) => String(p.id)}
        isPending={payments.isPending}
        isFetching={payments.isFetching}
        skeletonRows={3}
        emptyState={
          <EmptyState
            icon={Receipt}
            title="No payments yet"
            description="Every purchase, renewal and refund for this member will be listed here with who received it."
          />
        }
      />
    </div>
  );
}

/** Body-mass index and its usual category, from height (cm) and weight (kg). */
function bmiOf(heightCm: number, weightKg: number) {
  const bmi = weightKg / (heightCm / 100) ** 2;
  const label =
    bmi < 18.5
      ? "Underweight"
      : bmi < 25
        ? "Healthy range"
        : bmi < 30
          ? "Overweight"
          : "Obese range";
  return { value: bmi.toFixed(1), label };
}

export function HealthTab({ member, onEdit }: { member: MemberResponse; onEdit: () => void }) {
  const record = member.healthRecord;

  if (!record) {
    return (
      <Card>
        <EmptyState
          icon={HeartPulse}
          title="No health record"
          description={`Add ${member.name}'s height, weight and blood type, plus anything a coach should know before training them.`}
          action={
            <Button onClick={onEdit}>
              <Plus /> Add health record
            </Button>
          }
        />
      </Card>
    );
  }

  const bmi = bmiOf(record.height, record.weight);
  const tiles = [
    { label: "Height", value: `${record.height} cm` },
    { label: "Weight", value: `${record.weight} kg` },
    { label: "BMI", value: bmi.value, hint: bmi.label },
    { label: "Blood type", value: record.bloodType },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Health record</CardTitle>
        {/* CardAction is the card's slot for a button on the right of the title. */}
        <CardAction>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil /> Update
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">{tile.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{tile.value}</p>
              {tile.hint && <p className="text-xs text-muted-foreground">{tile.hint}</p>}
            </div>
          ))}
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Notes for trainers</p>
          <p className="text-sm whitespace-pre-line text-muted-foreground">
            {record.note || "No notes. Nothing special to watch out for."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
