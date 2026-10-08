"use client";

import Link from "next/link";
import {
  CalendarCheck2,
  CalendarRange,
  Mail,
  Phone,
  Snowflake,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { useAuth } from "@/features/auth/hooks";
import { MembershipStateBadge } from "@/features/member-portal/components/membership-state-badge";
import { useMyMemberships, useMyProfile } from "@/features/member-portal/queries";
import { daysUntil, firstName, formatDate, formatMoney, greeting } from "@/lib/format";
import type { MembershipResponse } from "@/types";

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
  const shown = current ?? upcoming;

  if (!shown) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </span>
          <p className="text-lg font-semibold">You don&apos;t have an active membership</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Compare our plans, then visit the front desk to start. Your membership will appear here
            the moment it&apos;s activated.
          </p>
          <Button asChild className="mt-2">
            <Link href="/#memberships">Compare memberships</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const start = new Date(shown.startDate).getTime();
  const end = new Date(shown.endDate).getTime();
  const usedPercent =
    shown.state === "Upcoming"
      ? 0
      : Math.min(100, Math.max(0, ((now.getTime() - start) / (end - start)) * 100));
  const daysLeft = daysUntil(shown.endDate, now);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-indigo-900 p-6 text-primary-foreground shadow-xl shadow-primary/25 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-white/10 blur-2xl"
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-white/70 uppercase">
            Your membership
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
          {shown.state === "Upcoming" ? (
            <>
              <p className="text-sm text-white/70">Starts in</p>
              <p className="text-5xl font-extrabold tabular-nums">
                {daysUntil(shown.startDate, now)}
                <span className="ms-2 text-lg font-semibold text-white/80">days</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-white/70">Days left</p>
              <p className="text-5xl font-extrabold tabular-nums">{daysLeft}</p>
            </>
          )}
        </div>
        <dl className="flex gap-8 text-sm">
          <div>
            <dt className="text-white/70">Started</dt>
            <dd className="font-semibold">{formatDate(shown.startDate)}</dd>
          </div>
          <div>
            <dt className="text-white/70">Valid until</dt>
            <dd className="font-semibold">{formatDate(shown.endDate)}</dd>
          </div>
        </dl>
      </div>

      {shown.state !== "Upcoming" && (
        <div
          className="relative mt-6 h-2 overflow-hidden rounded-full bg-white/20"
          role="progressbar"
          aria-label="Membership time used"
          aria-valuenow={Math.round(usedPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-white" style={{ width: `${usedPercent}%` }} />
        </div>
      )}

      {(shown.state === "Frozen" || (current && upcoming)) && (
        <div className="relative mt-6 flex flex-col gap-2 border-t border-white/15 pt-4 text-sm text-white/85">
          {shown.state === "Frozen" && shown.frozenUntil && (
            <p className="flex items-center gap-2">
              <Snowflake className="size-4" />
              Frozen until {formatDate(shown.frozenUntil)}. Your end date moves forward by the
              frozen days.
            </p>
          )}
          {current && upcoming && (
            <p className="flex items-center gap-2">
              <CalendarCheck2 className="size-4" />
              Renewed: {upcoming.planName} starts on {formatDate(upcoming.startDate)}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileCard() {
  const profile = useMyProfile();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your details</CardTitle>
        <CardDescription>What the gym has on file for you.</CardDescription>
      </CardHeader>
      <CardContent>
        {profile.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : profile.isError ? (
          <QueryError
            title="We couldn't load your details"
            error={profile.error}
            onRetry={() => void profile.refetch()}
            retrying={profile.isFetching}
          />
        ) : (
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <UserRound className="size-4 text-muted-foreground" />
              {profile.data.name}
            </li>
            <li className="flex items-center gap-3">
              <Mail className="size-4 text-muted-foreground" />
              <span className="truncate">{profile.data.email}</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="size-4 text-muted-foreground" />
              {profile.data.phone}
            </li>
            <li className="flex items-center gap-3">
              <CalendarRange className="size-4 text-muted-foreground" />
              Member since {formatDate(profile.data.createdAt)}
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryCard({ memberships }: { memberships: MembershipResponse[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Membership history</CardTitle>
        <CardDescription>
          {memberships.length === 0
            ? "Your memberships will be listed here."
            : `${memberships.length} ${memberships.length === 1 ? "membership" : "memberships"} so far.`}
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
                    {formatDate(m.startDate)} – {formatDate(m.endDate)} · {formatMoney(m.pricePaid)}
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

/** The member home page: membership card, personal details and history. Booking and QR come in F5. */
export function MemberOverview() {
  const { user } = useAuth();
  const memberships = useMyMemberships();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${firstName(user?.fullName ?? "")}`}
        description="Everything about your membership, in one place."
      />

      {memberships.isPending ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : memberships.isError ? (
        <QueryError
          title="We couldn't load your membership"
          error={memberships.error}
          onRetry={() => void memberships.refetch()}
          retrying={memberships.isFetching}
        />
      ) : (
        <MembershipCard {...pickCurrent(memberships.data)} />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <ProfileCard />
        {memberships.data && <HistoryCard memberships={memberships.data} />}
      </div>
    </div>
  );
}
