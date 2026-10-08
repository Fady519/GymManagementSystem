"use client";

import { CalendarRange, Receipt, Snowflake, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/shared/query-error";
import { MembershipStateBadge } from "@/features/member-portal/components/membership-state-badge";
import { useMembership } from "@/features/memberships/queries";
import { PAYMENT_TYPE_STYLE } from "@/features/payments/payment-meta";
import { formatDate, formatDateTime, formatDays, formatDuration, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MembershipResponse } from "@/types";
import { Link } from "@/i18n/navigation";

/** Days a freeze really used when it ended early: a started day counts (same rule as the API). */
function usedDays(start: string, endedAt: string): number {
  const ms = new Date(endedAt).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

type MembershipDetailsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: MembershipResponse | null;
  /** The action buttons (renew, freeze...) come from the page, which owns the dialogs. */
  actions?: React.ReactNode;
};

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Receipt;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-muted-foreground" /> {title}
      </h3>
      {children}
    </section>
  );
}

/** One membership's full story: the period, every payment and every freeze. */
export function MembershipDetailsSheet({
  open,
  onOpenChange,
  membership,
  actions,
}: MembershipDetailsSheetProps) {
  const details = useMembership(open && membership ? membership.id : null);
  // Show the row we already have while the details load, then the fresh data.
  const current = details.data?.membership ?? membership;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        {current && (
          <>
            <SheetHeader className="border-b">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-lg">{current.planName}</SheetTitle>
                <MembershipStateBadge state={current.state} />
              </div>
              <SheetDescription>
                <Link
                  href={`/dashboard/members/${current.memberId}`}
                  className="inline-flex items-center gap-1.5 hover:underline"
                >
                  <UserRound className="size-3.5" /> {current.memberName}
                </Link>
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Starts", value: formatDate(current.startDate) },
                  { label: "Ends", value: formatDate(current.endDate) },
                  { label: "Paid", value: formatMoney(current.pricePaid) },
                  { label: "Length", value: formatDuration(current.durationDays) },
                ].map((tile) => (
                  <div key={tile.label} className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">{tile.label}</p>
                    <p className="mt-0.5 font-semibold tabular-nums">{tile.value}</p>
                  </div>
                ))}
              </div>

              {current.frozenUntil && (
                <p className="flex items-center gap-2 rounded-lg bg-sky-500/10 p-3 text-sm text-sky-800 dark:text-sky-200">
                  <Snowflake className="size-4" /> Frozen until {formatDate(current.frozenUntil)}.
                </p>
              )}
              {current.state === "Cancelled" && (
                <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  Cancelled {current.cancelledAt ? `on ${formatDate(current.cancelledAt)}` : ""}
                  {current.cancellationReason ? `: ${current.cancellationReason}` : "."}
                </p>
              )}

              {actions && <div className="flex flex-wrap gap-2">{actions}</div>}

              {details.isError ? (
                <QueryError
                  title="We couldn't load the history"
                  error={details.error}
                  onRetry={() => void details.refetch()}
                  retrying={details.isFetching}
                />
              ) : !details.data ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : (
                <>
                  <Section icon={Receipt} title="Payments">
                    <ul className="divide-y rounded-lg border">
                      {details.data.payments.map((payment) => (
                        <li
                          key={payment.id}
                          className="flex items-center justify-between gap-3 p-3 text-sm"
                        >
                          <div>
                            <Badge variant="outline" className={PAYMENT_TYPE_STYLE[payment.type]}>
                              {payment.type}
                            </Badge>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDateTime(payment.paidAt)} · {payment.method}
                              {payment.receivedBy ? ` · by ${payment.receivedBy}` : ""}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              payment.type === "Refund" && "text-destructive",
                            )}
                          >
                            {payment.type === "Refund" ? "−" : ""}
                            {formatMoney(payment.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Section>

                  <Section
                    icon={CalendarRange}
                    title={`Freezes (${formatDays(current.totalFrozenDays)} used)`}
                  >
                    {details.data.freezes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Never frozen.</p>
                    ) : (
                      <ul className="divide-y rounded-lg border">
                        {details.data.freezes.map((freeze) => (
                          <li key={freeze.id} className="p-3 text-sm">
                            <p className="font-medium">
                              {formatDate(freeze.startDate)} →{" "}
                              {formatDate(freeze.endedEarlyAt ?? freeze.endDate)}
                              <span className="ms-2 text-xs font-normal text-muted-foreground">
                                {freeze.endedEarlyAt
                                  ? `ended early · ${formatDays(usedDays(freeze.startDate, freeze.endedEarlyAt))} of ${freeze.days} used`
                                  : formatDays(freeze.days)}
                              </span>
                            </p>
                            {freeze.reason && (
                              <p className="text-xs text-muted-foreground">{freeze.reason}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Section>
                </>
              )}

              <Button variant="outline" className="w-full" asChild>
                <Link href={`/dashboard/members/${current.memberId}?tab=memberships`}>
                  Open member profile
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
