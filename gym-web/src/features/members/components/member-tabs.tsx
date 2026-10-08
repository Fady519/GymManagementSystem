"use client";

import { useMemo } from "react";
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
import { DataTable, createColumns } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryError } from "@/components/shared/query-error";
import { useMemberMemberships, useMemberPayments } from "@/features/members/queries";
import { MembershipStateBadge } from "@/features/member-portal/components/membership-state-badge";
import { formatDate, formatDateTime, formatDuration, formatMoney } from "@/lib/format";
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
        {getValue() > 0 ? `${getValue()} days` : "—"}
      </span>
    ),
  }),
]);

export function MembershipsTab({ member }: { member: MemberResponse }) {
  const memberships = useMemberMemberships(member.id);

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
    <DataTable
      label={`${member.name}'s memberships`}
      columns={membershipColumns}
      data={memberships.data?.items}
      getRowId={(m) => String(m.id)}
      isPending={memberships.isPending}
      isFetching={memberships.isFetching}
      skeletonRows={3}
      emptyState={
        <EmptyState
          icon={Ticket}
          title="No memberships yet"
          description={`${member.name} hasn't bought a plan yet. Their memberships, renewals and freezes will show up here.`}
        />
      }
    />
  );
}

const TYPE_STYLE: Record<PaymentResponse["type"], string> = {
  Purchase: "border-primary/30 bg-primary/10 text-primary",
  Renewal: "border-success/30 bg-success/10 text-success",
  Refund: "border-destructive/30 bg-destructive/10 text-destructive",
};

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
      <Badge variant="outline" className={TYPE_STYLE[getValue()]}>
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
