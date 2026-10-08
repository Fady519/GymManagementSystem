"use client";

import { useMemo, useState } from "react";
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
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, createColumns } from "@/components/data-table/data-table";
import { RowActions } from "@/components/data-table/row-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryError } from "@/components/shared/query-error";
import { isolate } from "@/lib/bidi";
import {
  useMemberBookings,
  useMemberMemberships,
  useMemberPayments,
} from "@/features/members/queries";
import { MembershipStateBadge } from "@/features/member-portal/components/membership-state-badge";
import { bmiOf } from "@/features/member-profile/bmi";
import { useMembershipActions } from "@/features/memberships/components/membership-actions";
import { SellMembershipSheet } from "@/features/memberships/components/sell-membership-sheet";
import { PAYMENT_TYPE_STYLE } from "@/features/payments/payment-meta";
import { BookingStatusBadge } from "@/features/sessions/components/session-badges";
import { useDialogState } from "@/hooks/use-dialog-state";
import { useFormat } from "@/hooks/use-format";
import { useNow } from "@/hooks/use-now";
import { ageOn } from "@/lib/validation";
import { cn } from "@/lib/utils";
import type { MemberResponse, MembershipResponse, PaymentResponse } from "@/types";
import { Link } from "@/i18n/navigation";

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
  const t = useTranslations("Members.overview");
  const tForm = useTranslations("Members.form");
  const tEnums = useTranslations("Enums");
  const f = useFormat();
  // The clock is read after the page loads (null before), never during rendering.
  const now = useNow();
  const age = now ? ageOn(now, member.dateOfBirth) : null;
  const address = member.address;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("personal")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <InfoRow icon={Mail} label={tForm("email")}>
              <a href={`mailto:${member.email}`} dir="ltr" className="hover:underline">
                {member.email}
              </a>
            </InfoRow>
            <InfoRow icon={Phone} label={t("mobile")}>
              <a href={`tel:${member.phone}`} dir="ltr" className="tabular-nums hover:underline">
                {member.phone}
              </a>
            </InfoRow>
            <InfoRow icon={CalendarDays} label={tForm("dateOfBirth")}>
              {age === null
                ? f.date(member.dateOfBirth)
                : t("birthday", { date: f.date(member.dateOfBirth), age })}
            </InfoRow>
            <InfoRow icon={UserRound} label={tForm("gender")}>
              {tEnums(`Gender.${member.gender}`)}
            </InfoRow>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("address")}</CardTitle>
        </CardHeader>
        <CardContent>
          {address ? (
            <dl className="divide-y">
              {/* The address is shown exactly as it was typed, in its own direction. */}
              <InfoRow icon={MapPin} label={t("street")}>
                <bdi>
                  {address.buildingNumber} {address.street}
                </bdi>
              </InfoRow>
              <InfoRow icon={MapPin} label={t("city")}>
                <bdi>{address.city}</bdi>
              </InfoRow>
            </dl>
          ) : (
            <p className="py-3 text-sm text-muted-foreground">{t("noAddress")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const membershipCol = createColumns<MembershipResponse>();

export function MembershipsTab({ member }: { member: MemberResponse }) {
  const t = useTranslations("Members.membershipsTab");
  const tCols = useTranslations("Members.columns");
  const f = useFormat();
  const memberships = useMemberMemberships(member.id);
  const actions = useMembershipActions();
  const sell = useDialogState<null>();
  const { rowActions, showDetails } = actions;
  // A member with nothing running buys a new membership; otherwise they renew the current one.
  const canBuy = member.membershipState === "None" || member.membershipState === "Expired";
  const name = isolate(member.name);

  const columns = useMemo(
    () =>
      membershipCol.columns([
        membershipCol.accessor("planName", {
          header: tCols("plan"),
          cell: ({ row }) => (
            <div>
              <p className="font-medium">
                <bdi>{row.original.planName}</bdi>
              </p>
              <p className="text-xs text-muted-foreground">
                {f.duration(row.original.durationDays)}
              </p>
            </div>
          ),
        }),
        membershipCol.accessor("startDate", {
          header: tCols("period"),
          cell: ({ row }) => (
            <span className="whitespace-nowrap">
              {tCols("dateRange", {
                start: f.date(row.original.startDate),
                end: f.date(row.original.endDate),
              })}
            </span>
          ),
        }),
        membershipCol.accessor("pricePaid", {
          header: tCols("paid"),
          meta: { className: "hidden sm:table-cell" },
          cell: ({ getValue }) => <span className="tabular-nums">{f.money(getValue())}</span>,
        }),
        membershipCol.accessor("state", {
          header: tCols("status"),
          cell: ({ row }) => (
            <div className="flex flex-col items-start gap-1">
              <MembershipStateBadge state={row.original.state} />
              {row.original.frozenUntil && (
                <span className="text-xs text-muted-foreground">
                  {tCols("frozenUntil", { date: f.date(row.original.frozenUntil) })}
                </span>
              )}
            </div>
          ),
        }),
        membershipCol.accessor("totalFrozenDays", {
          header: tCols("frozen"),
          meta: { className: "hidden md:table-cell" },
          cell: ({ getValue }) => (
            <span className="text-muted-foreground tabular-nums">
              {getValue() > 0 ? f.days(getValue()) : "—"}
            </span>
          ),
        }),
        membershipCol.display({
          id: "actions",
          header: () => <span className="sr-only">{tCols("actions")}</span>,
          meta: { className: "w-12 text-end" },
          cell: ({ row }) => (
            <RowActions
              label={tCols("rowActions", { name: isolate(row.original.planName) })}
              actions={rowActions(row.original)}
            />
          ),
        }),
      ]),
    [rowActions, tCols, f],
  );

  if (memberships.isError) {
    return (
      <QueryError
        title={t("loadError")}
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
            <Plus /> {t("new")}
          </Button>
        </div>
      )}
      <DataTable
        label={t("tableLabel", { name })}
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
            title={t("emptyTitle")}
            description={t("emptyBody", { name })}
            action={
              <Button onClick={() => sell.show(null)}>
                <Plus /> {t("sell")}
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
  const t = useTranslations("Members.bookingsTab");
  const f = useFormat();
  const [upcoming, setUpcoming] = useState(true);
  const [page, setPage] = useState(1);
  const bookings = useMemberBookings(member.id, { upcoming, page, pageSize: BOOKINGS_PAGE_SIZE });
  // Read the clock once (not on every render) to tell finished classes apart.
  const [openedAt] = useState(() => Date.now());
  const name = isolate(member.name);

  const show = (next: boolean) => {
    setUpcoming(next);
    setPage(1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardAction>
          <div
            className="inline-flex rounded-lg border bg-muted/40 p-0.5"
            role="group"
            aria-label={t("which")}
          >
            {[
              { value: true, label: t("upcoming") },
              { value: false, label: t("history") },
            ].map((option) => (
              <Button
                key={String(option.value)}
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
        ) : bookings.data.items.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            className="py-8"
            title={upcoming ? t("emptyUpcomingTitle") : t("emptyTitle")}
            description={upcoming ? t("emptyUpcomingBody", { name }) : t("emptyBody", { name })}
            action={
              <Button variant="outline" asChild>
                <Link href="/dashboard/sessions">{t("openTimetable")}</Link>
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
                        <Badge variant="secondary">
                          <bdi>{booking.categoryName}</bdi>
                        </Badge>
                        <span dir="auto" className="truncate">
                          {booking.sessionDescription}
                        </span>
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("when", {
                          time: f.classTime(booking.sessionStartDate),
                          trainer: isolate(booking.trainerName),
                        })}
                      </p>
                      {classCancelled && (
                        <p className="mt-1 text-xs text-destructive">
                          {booking.sessionCancelReason
                            ? t("classCancelledReason", {
                                reason: isolate(booking.sessionCancelReason),
                              })
                            : t("classCancelled")}
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
                  {t("page", {
                    page: f.number(bookings.data.page),
                    total: f.number(bookings.data.totalPages),
                  })}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!bookings.data.hasPreviousPage}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    {t("previous")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!bookings.data.hasNextPage}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {t("next")}
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

export function PaymentsTab({ member }: { member: MemberResponse }) {
  const t = useTranslations("Members.paymentsTab");
  const tCols = useTranslations("Members.columns");
  const tEnums = useTranslations("Enums");
  const f = useFormat();
  const payments = useMemberPayments(member.id);

  const columns = useMemo(
    () =>
      paymentCol.columns([
        paymentCol.accessor("paidAt", {
          header: tCols("date"),
          cell: ({ getValue }) => (
            <span className="whitespace-nowrap">{f.dateTime(getValue())}</span>
          ),
        }),
        paymentCol.accessor("planName", {
          header: tCols("plan"),
          cell: ({ getValue }) => <bdi>{getValue()}</bdi>,
        }),
        paymentCol.accessor("type", {
          header: tCols("type"),
          cell: ({ getValue }) => (
            <Badge variant="outline" className={PAYMENT_TYPE_STYLE[getValue()]}>
              {tEnums(`PaymentType.${getValue()}`)}
            </Badge>
          ),
        }),
        paymentCol.accessor("method", {
          header: tCols("method"),
          meta: { className: "hidden sm:table-cell" },
          cell: ({ getValue }) => tEnums(`PaymentMethod.${getValue()}`),
        }),
        paymentCol.accessor("amount", {
          header: tCols("amount"),
          meta: { className: "text-end" },
          cell: ({ row }) => {
            const refund = row.original.type === "Refund";
            return (
              <span className={cn("font-semibold tabular-nums", refund && "text-destructive")}>
                {refund ? "−" : ""}
                {f.money(row.original.amount)}
              </span>
            );
          },
        }),
        paymentCol.accessor("receivedBy", {
          header: tCols("receivedBy"),
          meta: { className: "hidden lg:table-cell" },
          cell: ({ getValue }) => <bdi className="text-muted-foreground">{getValue() ?? "—"}</bdi>,
        }),
      ]),
    [tCols, tEnums, f],
  );

  const totals = useMemo(() => {
    const list = payments.data ?? [];
    const paid = list.filter((p) => p.type !== "Refund").reduce((sum, p) => sum + p.amount, 0);
    const refunded = list.filter((p) => p.type === "Refund").reduce((sum, p) => sum + p.amount, 0);
    return { paid, refunded, net: paid - refunded };
  }, [payments.data]);

  if (payments.isError) {
    return (
      <QueryError
        title={t("loadError")}
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
            { label: t("totalPaid"), value: totals.paid },
            { label: t("refunded"), value: totals.refunded },
            { label: t("netPaid"), value: totals.net },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{f.money(item.value)}</p>
            </div>
          ))}
        </div>
      )}
      <DataTable
        label={t("tableLabel", { name: isolate(member.name) })}
        columns={columns}
        data={payments.data}
        getRowId={(p) => String(p.id)}
        isPending={payments.isPending}
        isFetching={payments.isFetching}
        skeletonRows={3}
        emptyState={
          <EmptyState icon={Receipt} title={t("emptyTitle")} description={t("emptyBody")} />
        }
      />
    </div>
  );
}

export function HealthTab({ member, onEdit }: { member: MemberResponse; onEdit: () => void }) {
  const t = useTranslations("Members.healthTab");
  const tHealth = useTranslations("Members.health");
  // Same BMI categories as the member's own profile page.
  const tBmi = useTranslations("MemberProfile.health.bmiCategories");
  const f = useFormat();
  const record = member.healthRecord;

  if (!record) {
    return (
      <Card>
        <EmptyState
          icon={HeartPulse}
          title={t("emptyTitle")}
          description={t("emptyBody", { name: isolate(member.name) })}
          action={
            <Button onClick={onEdit}>
              <Plus /> {t("add")}
            </Button>
          }
        />
      </Card>
    );
  }

  const bmi = bmiOf(String(record.height), String(record.weight));
  const tiles = [
    { label: t("height"), value: t("heightValue", { value: f.number(record.height) }) },
    { label: t("weight"), value: t("weightValue", { value: f.number(record.weight) }) },
    {
      label: t("bmi"),
      value: bmi ? f.number(bmi.value) : "—",
      hint: bmi ? tBmi(bmi.category) : undefined,
    },
    // dir="ltr": in Arabic, "A+" would otherwise show as "+A".
    { label: tHealth("bloodType"), value: <span dir="ltr">{record.bloodType}</span> },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        {/* CardAction is the card's slot for a button on the right of the title. */}
        <CardAction>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil /> {t("update")}
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
          <p className="mb-1 text-sm font-medium">{tHealth("note")}</p>
          {record.note ? (
            // The note is the staff's own text: shown as typed, in its own direction.
            <p dir="auto" className="text-sm whitespace-pre-line text-muted-foreground">
              {record.note}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noNotes")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
