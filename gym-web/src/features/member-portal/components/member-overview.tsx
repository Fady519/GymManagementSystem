"use client";

import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarPlus,
  Clock,
  ListChecks,
  QrCode,
  Snowflake,
  Sparkles,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { useAuth } from "@/features/auth/hooks";
import { MembershipStateBadge } from "@/features/member-portal/components/membership-state-badge";
import { useMyBookings, useMyMemberships } from "@/features/member-portal/queries";
import { useFormat } from "@/hooks/use-format";
import { useNow } from "@/hooks/use-now";
import { Link } from "@/i18n/navigation";
import { daysUntil, firstName } from "@/lib/format";
import type { MembershipResponse } from "@/types";

/** Days left at or below this number show a "renew soon" reminder on the card. */
const ENDING_SOON_DAYS = 7;

/**
 * Picks what to show on the big card:
 * the running membership (active or frozen) first, otherwise the next one that hasn't started yet.
 */
function pickCurrent(memberships: MembershipResponse[]) {
  const current = memberships.find((m) => m.state === "Active" || m.state === "Frozen");
  const upcoming = memberships.find((m) => m.state === "Upcoming");
  return { current, upcoming };
}

/** The member's current membership, styled like a membership card. */
function MembershipCard({
  current,
  upcoming,
}: {
  current: MembershipResponse | undefined;
  upcoming: MembershipResponse | undefined;
}) {
  const t = useTranslations("MemberPortal.card");
  const f = useFormat();
  const now = useNow();
  const shown = current ?? upcoming;

  if (!shown) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </span>
          <p className="text-lg font-semibold">{t("noneTitle")}</p>
          <p className="max-w-md text-sm text-muted-foreground">{t("noneBody")}</p>
          <Button asChild className="mt-2">
            <Link href="/#memberships">{t("compare")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const start = new Date(shown.startDate).getTime();
  const end = new Date(shown.endDate).getTime();
  const isUpcoming = shown.state === "Upcoming";
  const usedPercent =
    isUpcoming || !now
      ? 0
      : Math.min(100, Math.max(0, ((now.getTime() - start) / (end - start)) * 100));
  const daysLeft = now ? daysUntil(shown.endDate, now) : null;
  const endingSoon = !isUpcoming && !upcoming && daysLeft !== null && daysLeft <= ENDING_SOON_DAYS;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-indigo-900 p-6 text-primary-foreground shadow-xl shadow-primary/25 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -end-16 -top-20 size-64 rounded-full bg-white/10 blur-2xl"
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-white/70 uppercase">
            {t("label")}
          </p>
          <p className="mt-1 text-2xl font-extrabold sm:text-3xl">{shown.planName}</p>
        </div>
        <MembershipStateBadge
          state={shown.state}
          className="border-white/30 bg-white/15 text-white"
        />
      </div>

      <div className="relative mt-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm text-white/70">{isUpcoming ? t("startsIn") : t("daysLeft")}</p>
          <p className="text-5xl font-extrabold tabular-nums">
            {now ? f.number(isUpcoming ? daysUntil(shown.startDate, now) : daysLeft!) : "–"}
          </p>
        </div>
        <dl className="flex gap-8 text-sm">
          <div>
            <dt className="text-white/70">{isUpcoming ? t("startsOn") : t("started")}</dt>
            <dd className="font-semibold">{f.date(shown.startDate)}</dd>
          </div>
          <div>
            <dt className="text-white/70">{t("validUntil")}</dt>
            <dd className="font-semibold">{f.date(shown.endDate)}</dd>
          </div>
        </dl>
      </div>

      {!isUpcoming && (
        <div
          className="relative mt-6 h-2 overflow-hidden rounded-full bg-white/20"
          role="progressbar"
          aria-label={t("progress")}
          aria-valuenow={Math.round(usedPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-white" style={{ width: `${usedPercent}%` }} />
        </div>
      )}

      {(shown.state === "Frozen" || (current && upcoming) || endingSoon) && (
        <div className="relative mt-6 flex flex-col gap-2 border-t border-white/15 pt-4 text-sm text-white/85">
          {shown.state === "Frozen" && shown.frozenUntil && (
            <p className="flex items-center gap-2">
              <Snowflake className="size-4 shrink-0" />
              {t("frozenUntil", { date: f.date(shown.frozenUntil) })}
            </p>
          )}
          {current && upcoming && (
            <p className="flex items-center gap-2">
              <CalendarCheck2 className="size-4 shrink-0" />
              {t("renewed", { plan: upcoming.planName, date: f.date(upcoming.startDate) })}
            </p>
          )}
          {endingSoon && (
            <p className="flex items-center gap-2">
              <TriangleAlert className="size-4 shrink-0" />
              {t("endingSoon")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Big, thumb-friendly shortcuts to the member pages. */
function QuickActions() {
  const t = useTranslations("MemberPortal.overview");
  const actions: { href: string; icon: ReactNode; title: string; hint: string }[] = [
    { href: "/me/qr", icon: <QrCode />, title: t("qr"), hint: t("qrHint") },
    { href: "/me/classes", icon: <CalendarPlus />, title: t("book"), hint: t("bookHint") },
    { href: "/me/bookings", icon: <ListChecks />, title: t("bookings"), hint: t("bookingsHint") },
    { href: "/me/profile", icon: <UserRound />, title: t("profile"), hint: t("profileHint") },
  ];

  return (
    <section aria-label={t("quickActions")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group flex flex-col gap-3 rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground [&_svg]:size-5">
            {action.icon}
          </span>
          <span>
            <span className="block font-semibold">{action.title}</span>
            <span className="block text-xs text-muted-foreground">{action.hint}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}

/** The member's next booked class (GET /api/me/bookings?upcoming=true, first item). */
function NextClassCard() {
  const t = useTranslations("MemberPortal.overview");
  const f = useFormat();
  const bookings = useMyBookings(true, 1, 1);
  const next = bookings.data?.items[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="space-y-1.5">
          <CardTitle>{t("nextClass")}</CardTitle>
          {bookings.data && bookings.data.totalCount > 1 && (
            <CardDescription>
              <Link href="/me/bookings" className="hover:text-foreground hover:underline">
                {t("allBookings")} ({f.number(bookings.data.totalCount)})
              </Link>
            </CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {bookings.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : bookings.isError ? (
          <QueryError
            title={t("loadError")}
            error={bookings.error}
            onRetry={() => void bookings.refetch()}
            retrying={bookings.isFetching}
          />
        ) : next ? (
          <div className="flex items-center gap-4">
            <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-primary/10 py-2 text-primary">
              <span className="text-xs font-medium">{f.weekday(next.sessionStartDate)}</span>
              <span className="text-lg font-bold tabular-nums" dir="ltr">
                {f.time(next.sessionStartDate)}
              </span>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <Badge variant="secondary">{next.categoryName}</Badge>
              <p className="truncate font-semibold">{next.sessionDescription}</p>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-3.5" /> {f.longDay(next.sessionStartDate)}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">{t("nextClassNone")}</p>
            <Button asChild size="sm">
              <Link href="/me/classes">
                {t("browseClasses")} <ArrowRight className="rtl:rotate-180" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryCard({ memberships }: { memberships: MembershipResponse[] }) {
  const t = useTranslations("MemberPortal.overview");
  const f = useFormat();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("history")}</CardTitle>
        <CardDescription>
          {memberships.length === 0
            ? t("historyEmpty")
            : t("historyCount", { count: memberships.length })}
        </CardDescription>
      </CardHeader>
      {memberships.length > 0 && (
        <CardContent>
          <ul className="divide-y">
            {memberships.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">{m.planName}</p>
                  <p className="text-sm text-muted-foreground">
                    {f.date(m.startDate)} – {f.date(m.endDate)} ·{" "}
                    {t("paid", { amount: f.money(m.pricePaid) })}
                  </p>
                </div>
                <MembershipStateBadge state={m.state} />
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}

/** The member home page: membership card, quick actions, next class and membership history. */
export function MemberOverview() {
  const t = useTranslations("MemberPortal.overview");
  const f = useFormat();
  const now = useNow();
  const { user } = useAuth();
  const memberships = useMyMemberships();

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          now
            ? t("greeting", { greeting: f.greeting(now), name: firstName(user?.fullName ?? "") })
            : firstName(user?.fullName ?? "")
        }
        description={t("subtitle")}
      />

      {memberships.isPending ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : memberships.isError ? (
        <QueryError
          title={t("loadError")}
          error={memberships.error}
          onRetry={() => void memberships.refetch()}
          retrying={memberships.isFetching}
        />
      ) : (
        <MembershipCard {...pickCurrent(memberships.data)} />
      )}

      <QuickActions />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <NextClassCard />
        {memberships.data && <HistoryCard memberships={memberships.data} />}
      </div>
    </div>
  );
}
