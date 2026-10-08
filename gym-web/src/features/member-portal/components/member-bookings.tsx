"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, CalendarPlus, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { CancelBookingButton } from "@/features/member-portal/components/cancel-booking-button";
import { useMyBookings } from "@/features/member-portal/queries";
import { useFormat } from "@/hooks/use-format";
import { useNow } from "@/hooks/use-now";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { MyBookingItem } from "@/types";

const PAGE_SIZE = 10;

type Tab = "upcoming" | "all";

/** What the member sees as the booking's status (the class being cancelled wins over the booking). */
type DisplayStatus = "Booked" | "Attended" | "Cancelled" | "Missed" | "ClassCancelled";

const STATUS_STYLE: Record<DisplayStatus, string> = {
  Booked: "border-primary/30 bg-primary/10 text-primary",
  Attended: "border-success/30 bg-success/15 text-success",
  Cancelled: "border-border bg-muted text-muted-foreground",
  Missed: "border-warning/30 bg-warning/10 text-warning",
  ClassCancelled: "border-destructive/30 bg-destructive/10 text-destructive",
};

function displayStatus(b: MyBookingItem, now: Date | null): DisplayStatus {
  if (b.sessionStatus === "Cancelled") return "ClassCancelled";
  // Still "Booked" after the class ended = the member didn't show up.
  if (b.status === "Booked" && now && new Date(b.sessionEndDate) < now) return "Missed";
  return b.status;
}

/** The member's bookings: upcoming ones (with Cancel) and the full history, paged. */
export function MemberBookings() {
  const t = useTranslations("MemberPortal.bookings");
  const [tab, setTab] = useState<Tab>("upcoming");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button asChild>
            <Link href="/me/classes">
              <CalendarPlus /> {t("browse")}
            </Link>
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="upcoming">{t("upcoming")}</TabsTrigger>
          <TabsTrigger value="all">{t("past")}</TabsTrigger>
        </TabsList>
        {/* Each tab keeps its own page number, and only the open tab loads data. */}
        <TabsContent value="upcoming" className="pt-2">
          <BookingList upcoming />
        </TabsContent>
        <TabsContent value="all" className="pt-2">
          <BookingList upcoming={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BookingList({ upcoming }: { upcoming: boolean }) {
  const t = useTranslations("MemberPortal.bookings");
  const [page, setPage] = useState(1);
  const bookings = useMyBookings(upcoming, page, PAGE_SIZE);

  if (bookings.isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (bookings.isError) {
    return (
      <QueryError
        title={t("loadError")}
        error={bookings.error}
        onRetry={() => void bookings.refetch()}
        retrying={bookings.isFetching}
      />
    );
  }

  const { items, totalPages, hasNextPage, hasPreviousPage } = bookings.data;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
        <p className="text-muted-foreground">{upcoming ? t("emptyUpcoming") : t("emptyPast")}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/me/classes">{t("browse")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className={cn("space-y-3", bookings.isPlaceholderData && "opacity-60")}>
        {items.map((booking) => (
          <BookingRow key={booking.id} booking={booking} />
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPreviousPage}
            onClick={() => setPage((p) => p - 1)}
          >
            <ArrowLeft className="rtl:rotate-180" /> {t("previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("page", { page, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("next")} <ArrowRight className="rtl:rotate-180" />
          </Button>
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking }: { booking: MyBookingItem }) {
  const t = useTranslations("MemberPortal");
  const f = useFormat();
  const now = useNow();
  const status = displayStatus(booking, now);
  const canCancel = status === "Booked" && now !== null && new Date(booking.sessionStartDate) > now;

  return (
    <li className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 gap-4">
        <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-muted py-2 text-center">
          <span className="text-xs font-medium text-muted-foreground">
            {f.weekday(booking.sessionStartDate)}
          </span>
          <span className="text-sm font-bold">{f.dayMonth(booking.sessionStartDate)}</span>
          <span className="text-xs tabular-nums" dir="ltr">
            {f.time(booking.sessionStartDate)}
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{booking.categoryName}</Badge>
            <Badge variant="outline" className={STATUS_STYLE[status]}>
              {t(`states.booking.${status}`)}
            </Badge>
          </div>
          <p className="truncate font-semibold">{booking.sessionDescription}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <UserRound className="size-3.5" /> {booking.trainerName} ·{" "}
            {t("bookings.bookedOn", { date: f.date(booking.createdAt) })}
          </p>
          {booking.sessionCancelReason && (
            <p className="text-xs text-destructive">
              {t("bookings.reason", { reason: booking.sessionCancelReason })}
            </p>
          )}
        </div>
      </div>
      {canCancel && (
        <div className="flex shrink-0 justify-end">
          <CancelBookingButton
            bookingId={booking.id}
            classTitle={booking.sessionDescription}
            startDate={booking.sessionStartDate}
          />
        </div>
      )}
    </li>
  );
}
