"use client";

import { useMemo } from "react";
import { ArrowRight, CalendarClock, Receipt, StickyNote, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { StatCard, StatCardSkeleton } from "@/components/shared/stat-card";
import { useMyPayments } from "@/features/member-payments/queries";
import {
  signedAmount,
  sortNewestFirst,
  summarizePayments,
} from "@/features/member-payments/summary";
import { PAYMENT_METHODS, PAYMENT_TYPE_STYLE } from "@/features/payments/payment-meta";
import { useFormat } from "@/hooks/use-format";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { PaymentMethod, PaymentResponse, PaymentType } from "@/types";

/** /me/payments: what the member has paid, with totals computed from the same list. */
export function MyPayments() {
  const t = useTranslations("MemberPayments");
  const payments = useMyPayments();

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      {payments.isPending ? (
        <PaymentsSkeleton />
      ) : payments.isError ? (
        <QueryError
          title={t("loadError")}
          error={payments.error}
          onRetry={() => void payments.refetch()}
          retrying={payments.isFetching}
        />
      ) : payments.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={Receipt}
            title={t("emptyTitle")}
            description={t("emptyBody")}
            action={
              <Button asChild>
                <Link href="/#memberships">
                  {t("emptyAction")} <ArrowRight className="rtl:rotate-180" />
                </Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <PaymentsContent payments={payments.data} />
      )}
    </div>
  );
}

function PaymentsContent({ payments }: { payments: PaymentResponse[] }) {
  const t = useTranslations("MemberPayments");
  const f = useFormat();
  // Sorting a copy once per new list, not on every render.
  const sorted = useMemo(() => sortNewestFirst(payments), [payments]);
  const summary = useMemo(() => summarizePayments(sorted), [sorted]);

  return (
    <>
      {/* Phones: the total gets its own row and the two smaller tiles share one, to save scrolling. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="col-span-2 grid sm:col-span-1">
          <StatCard
            icon={Wallet}
            label={t("totalPaid")}
            value={f.money(summary.netPaid)}
            hint={
              summary.refunded > 0
                ? t("totalPaidAfterRefunds", { amount: f.money(summary.refunded) })
                : t("totalPaidHint")
            }
          />
        </div>
        <StatCard
          icon={Receipt}
          tone="success"
          label={t("count")}
          value={f.number(summary.count)}
          hint={summary.oldest && t("countSince", { date: f.date(summary.oldest.paidAt) })}
        />
        <StatCard
          icon={CalendarClock}
          tone="warning"
          label={t("lastPayment")}
          // A date is long for the big number style, so it gets a smaller size.
          value={
            summary.latest && (
              <span className="text-lg sm:text-2xl">{f.date(summary.latest.paidAt)}</span>
            )
          }
          hint={summary.latest?.planName}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t("history")}</CardTitle>
          <CardDescription>{t("historyHint", { count: summary.count })}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Phones get one card per payment; wider screens get a table that's easy to scan. */}
          <ul className="divide-y md:hidden">
            {sorted.map((payment) => (
              <PaymentItem key={payment.id} payment={payment} />
            ))}
          </ul>
          <div className="hidden md:block">
            <PaymentsTable payments={sorted} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function PaymentsTable({ payments }: { payments: PaymentResponse[] }) {
  const t = useTranslations("MemberPayments");
  const f = useFormat();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("columns.date")}</TableHead>
          <TableHead>{t("columns.plan")}</TableHead>
          <TableHead>{t("columns.type")}</TableHead>
          <TableHead>{t("columns.method")}</TableHead>
          <TableHead className="text-end">{t("columns.amount")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell className="whitespace-nowrap">{f.date(payment.paidAt)}</TableCell>
            <TableCell className="whitespace-normal">
              <p className="font-medium">{payment.planName}</p>
              {payment.notes && (
                <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <StickyNote className="mt-0.5 size-3 shrink-0" aria-hidden />
                  <span>
                    <span className="sr-only">{t("note")}: </span>
                    {payment.notes}
                  </span>
                </p>
              )}
            </TableCell>
            <TableCell>
              <TypeBadge type={payment.type} />
            </TableCell>
            <TableCell>
              <MethodLabel method={payment.method} />
            </TableCell>
            <TableCell className="text-end">
              <Amount payment={payment} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** One payment on a phone: plan and amount on top, the details underneath. */
function PaymentItem({ payment }: { payment: PaymentResponse }) {
  const t = useTranslations("MemberPayments");
  const f = useFormat();

  return (
    <li className="space-y-2 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{payment.planName}</p>
          <p className="text-sm text-muted-foreground">{f.date(payment.paidAt)}</p>
        </div>
        <Amount payment={payment} className="text-base" />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <TypeBadge type={payment.type} />
        <MethodLabel method={payment.method} />
      </div>
      {payment.notes && (
        <p className="flex items-start gap-1.5 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
          <StickyNote className="mt-0.5 size-3 shrink-0" aria-hidden />
          <span>
            <span className="sr-only">{t("note")}: </span>
            {payment.notes}
          </span>
        </p>
      )}
    </li>
  );
}

function TypeBadge({ type }: { type: PaymentType }) {
  const t = useTranslations("MemberPayments");
  return (
    <Badge variant="outline" className={PAYMENT_TYPE_STYLE[type]}>
      {t(`types.${type}`)}
    </Badge>
  );
}

function MethodLabel({ method }: { method: PaymentMethod }) {
  const t = useTranslations("MemberPayments");
  // Icons come from the shared payment-meta file so every page uses the same one per method.
  const Icon = PAYMENT_METHODS.find((m) => m.value === method)?.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      {Icon && <Icon className="size-4" aria-hidden />}
      {t(`methods.${method}`)}
    </span>
  );
}

/** Refunds are money going back to the member, so they show as a negative amount in red. */
function Amount({ payment, className }: { payment: PaymentResponse; className?: string }) {
  const f = useFormat();
  const refund = payment.type === "Refund";
  return (
    <span
      className={cn(
        "font-semibold whitespace-nowrap tabular-nums",
        refund && "text-destructive",
        className,
      )}
    >
      {f.money(signedAmount(payment))}
    </span>
  );
}

function PaymentsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="col-span-2 grid sm:col-span-1">
          <StatCardSkeleton />
        </div>
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    </>
  );
}
