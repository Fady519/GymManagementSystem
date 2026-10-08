"use client";

import { Cake, CalendarRange, Info, Lock, Mail, UserRound, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { useMyProfile } from "@/features/member-portal/queries";
import { ContactForm } from "@/features/member-profile/components/contact-form";
import { HealthForm } from "@/features/member-profile/components/health-form";
import { PhotoCard } from "@/features/member-profile/components/photo-card";
import { ProfileAvatar } from "@/features/member-profile/components/profile-avatar";
import { ProfileSection } from "@/features/member-profile/components/profile-section";
import { useFormat } from "@/hooks/use-format";
import type { MemberResponse } from "@/types";

/** /me/profile: the member's own details. Phone, address, health and photo save separately. */
export function MyProfile() {
  const t = useTranslations("MemberProfile");
  const profile = useMyProfile();

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      {profile.isPending ? (
        <ProfileSkeleton />
      ) : profile.isError ? (
        <QueryError
          title={t("loadError")}
          error={profile.error}
          onRetry={() => void profile.refetch()}
          retrying={profile.isFetching}
        />
      ) : (
        <ProfileContent profile={profile.data} />
      )}
    </div>
  );
}

function ProfileContent({ profile }: { profile: MemberResponse }) {
  return (
    <>
      <ProfileHeader profile={profile} />
      {/* Two columns on wide screens; on phones everything stacks in reading order. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <div className="space-y-6">
          <PhotoCard profile={profile} />
          <PersonalDetails profile={profile} />
        </div>
        <div className="space-y-6">
          <ContactForm profile={profile} />
          <HealthForm healthRecord={profile.healthRecord} />
        </div>
      </div>
    </>
  );
}

/** A banner with the photo (or initials), name, email and how long they've been a member. */
function ProfileHeader({ profile }: { profile: MemberResponse }) {
  const t = useTranslations("MemberProfile");
  const f = useFormat();

  return (
    <Card className="gap-0 pt-0">
      <div aria-hidden className="h-24 bg-gradient-to-br from-primary to-indigo-900 sm:h-28" />
      {/* -mt-10 pulls only the avatar's top into the banner; the name stays below it. */}
      <CardContent className="-mt-10 flex flex-col items-center gap-3 text-center sm:flex-row sm:items-end sm:gap-5 sm:text-start">
        <ProfileAvatar
          name={profile.name}
          photoUrl={profile.photoUrl}
          // bg-card: the initials' tinted background is see-through, the banner mustn't show behind it.
          className="size-24 bg-card shadow-lg ring-4 ring-card"
        />
        <div className="min-w-0 flex-1 sm:pb-1">
          <h2 className="truncate text-xl font-bold sm:text-2xl">{profile.name}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {/* An inline LTR span keeps the address readable without changing the text alignment. */}
            <span dir="ltr">{profile.email}</span>
          </p>
        </div>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground sm:mb-1">
          <CalendarRange className="size-3.5" aria-hidden />
          {t("memberSince", { date: f.date(profile.createdAt) })}
        </p>
      </CardContent>
    </Card>
  );
}

/** What only the front desk can change (the API's PUT /api/me accepts only phone and address). */
function PersonalDetails({ profile }: { profile: MemberResponse }) {
  const t = useTranslations("MemberProfile");
  const f = useFormat();

  const rows = [
    { icon: UserRound, label: t("personal.name"), value: profile.name },
    {
      icon: Mail,
      label: t("personal.email"),
      value: <span dir="ltr">{profile.email}</span>,
    },
    { icon: Cake, label: t("personal.dateOfBirth"), value: f.date(profile.dateOfBirth) },
    { icon: Users, label: t("personal.gender"), value: t(`genders.${profile.gender}`) },
  ];

  return (
    <ProfileSection icon={<Lock />} title={t("personal.title")} description={t("personal.hint")}>
      <dl className="divide-y">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 py-3 first:pt-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="truncate font-medium">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
      <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        {t("personal.frontDesk")}
      </p>
    </ProfileSection>
  );
}

function ProfileSkeleton() {
  return (
    <>
      <Skeleton className="h-48 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    </>
  );
}
