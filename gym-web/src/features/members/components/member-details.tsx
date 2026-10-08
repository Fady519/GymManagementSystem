"use client";

import { useId } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  ClipboardList,
  KeyRound,
  Loader2,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
  UserX,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryError } from "@/components/shared/query-error";
import { HealthRecordSheet } from "@/features/members/components/health-record-sheet";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { MemberEditSheet } from "@/features/members/components/member-edit-sheet";
import { MemberStateBadge } from "@/features/members/components/member-state-badge";
import {
  BookingsTab,
  HealthTab,
  MembershipsTab,
  OverviewTab,
  PaymentsTab,
} from "@/features/members/components/member-tabs";
import { isolate } from "@/lib/bidi";
import {
  useDeleteMember,
  useDeleteMemberPhoto,
  useMember,
  useSendMemberInvite,
  useUploadMemberPhoto,
} from "@/features/members/queries";
import { PHOTO_TYPES, photoProblem } from "@/features/members/schemas";
import { useDialogState } from "@/hooks/use-dialog-state";
import { useFormat } from "@/hooks/use-format";
import { useListParams } from "@/hooks/use-list-params";
import { ApiError } from "@/lib/api-error";
import { isAlreadyActivated, toastError, toastInvite } from "@/lib/notify";
import type { MemberResponse } from "@/types";
import { Link, useRouter } from "@/i18n/navigation";

const TABS = ["overview", "memberships", "bookings", "payments", "health"] as const;
type Tab = (typeof TABS)[number];

function DetailsSkeleton() {
  const t = useTranslations("Members.details");
  return (
    <div className="space-y-6" aria-busy="true" aria-label={t("loading")}>
      <Skeleton className="h-8 w-40" />
      <div className="flex items-center gap-5 rounded-xl border p-6">
        <Skeleton className="size-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <Skeleton className="h-9 w-96 max-w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

/** The big photo with a camera button to replace it, and a remove link. */
function ProfilePhoto({ member }: { member: MemberResponse }) {
  const t = useTranslations("Members.photo");
  const tErrors = useTranslations("Members.errors");
  const inputId = useId();
  const upload = useUploadMemberPhoto();
  const remove = useDeleteMemberPhoto();
  const busy = upload.isPending || remove.isPending;

  const onPick = (file: File | undefined) => {
    if (!file) return;
    const problem = photoProblem(file, tErrors);
    if (problem) {
      toast.error(t("cantUse"), { description: problem });
      return;
    }
    upload.mutate(
      { id: member.id, file },
      {
        onSuccess: () => toast.success(t("uploaded")),
        onError: (error) => toastError(t("uploadError"), error),
      },
    );
  };

  const cameraLabel = member.photoUrl ? t("change") : t("add");

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <MemberAvatar
          name={member.name}
          photoUrl={member.photoUrl}
          className="size-20 text-2xl ring-4 ring-background"
        />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}
        <label
          htmlFor={inputId}
          className="absolute -end-1 -bottom-1 flex size-8 cursor-pointer items-center justify-center rounded-full border bg-background shadow-sm transition-colors hover:bg-muted"
          aria-label={cameraLabel}
          title={cameraLabel}
        >
          <Camera className="size-4" />
        </label>
        <input
          id={inputId}
          type="file"
          accept={PHOTO_TYPES.join(",")}
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            onPick(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {member.photoUrl && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            remove.mutate(member.id, {
              onSuccess: () => toast.success(t("removed")),
              onError: (error) => toastError(t("removeError"), error),
            })
          }
          className="text-xs text-muted-foreground hover:text-destructive hover:underline"
        >
          {t("removePhoto")}
        </button>
      )}
    </div>
  );
}

function MemberProfile({ member }: { member: MemberResponse }) {
  const t = useTranslations("Members.details");
  const tList = useTranslations("Members.list");
  const f = useFormat();
  const router = useRouter();
  const params = useListParams();
  const rawTab = params.string("tab");
  const tab: Tab = (TABS as readonly string[]).includes(rawTab) ? (rawTab as Tab) : "overview";

  const invite = useSendMemberInvite();
  const deleteMember = useDeleteMember();
  const edit = useDialogState<MemberResponse>();
  const health = useDialogState<MemberResponse>();
  const confirmDelete = useDialogState<MemberResponse>();
  const name = isolate(member.name);

  const sendInvite = () =>
    invite.mutate(member.id, {
      onSuccess: (result) =>
        toastInvite(result.member.name, result.member.email, result.inviteSent),
      onError: (error) =>
        isAlreadyActivated(error)
          ? toast.info(t("alreadyActive", { name }), { description: t("alreadyActiveBody") })
          : toastError(t("inviteError", { name }), error),
    });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ms-2" asChild>
        <Link href="/dashboard/members">
          <ArrowLeft className="rtl:rotate-180" /> {t("allMembers")}
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-6 md:flex-row md:items-center">
          <ProfilePhoto member={member} />

          <div className="min-w-0 flex-1 space-y-2 text-center md:text-start">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <h1 className="text-2xl font-bold tracking-tight break-words">
                <bdi>{member.name}</bdi>
              </h1>
              <MemberStateBadge state={member.membershipState} />
              {member.hasAccount && (
                <Badge variant="outline" className="gap-1">
                  <KeyRound className="size-3" /> {t("onlineAccount")}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground md:justify-start">
              <a
                href={`mailto:${member.email}`}
                className="flex items-center gap-1.5 hover:text-foreground"
              >
                <Mail className="size-4" /> <span dir="ltr">{member.email}</span>
              </a>
              <a
                href={`tel:${member.phone}`}
                className="flex items-center gap-1.5 tabular-nums hover:text-foreground"
              >
                <Phone className="size-4" /> <span dir="ltr">{member.phone}</span>
              </a>
              <span>{t("memberSince", { date: f.date(member.createdAt) })}</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => edit.show(member)}>
              <Pencil /> {t("edit")}
            </Button>
            {!member.hasAccount && (
              <Button onClick={sendInvite} disabled={invite.isPending}>
                {invite.isPending ? <Loader2 className="animate-spin" /> : <KeyRound />}
                {t("giveAccess")}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label={t("moreActions")}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/check-ins?range=all&memberId=${member.id}`}>
                    <ClipboardList /> {t("attendance")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {member.hasAccount && (
                  <>
                    <DropdownMenuItem onSelect={sendInvite} disabled={invite.isPending}>
                      <Mail /> {t("resendInvite")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem variant="destructive" onSelect={() => confirmDelete.show(member)}>
                  <Trash2 /> {tList("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={tab}
        onValueChange={(value) => params.set({ tab: value === "overview" ? null : value })}
      >
        <TabsList className="h-auto! flex-wrap">
          {TABS.map((key) => (
            <TabsTrigger key={key} value={key}>
              {t(`tabs.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <OverviewTab member={member} />
        </TabsContent>
        <TabsContent value="memberships" className="mt-4">
          <MembershipsTab member={member} />
        </TabsContent>
        <TabsContent value="bookings" className="mt-4">
          <BookingsTab member={member} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentsTab member={member} />
        </TabsContent>
        <TabsContent value="health" className="mt-4">
          <HealthTab member={member} onEdit={() => health.show(member)} />
        </TabsContent>
      </Tabs>

      <MemberEditSheet open={edit.open} onOpenChange={edit.setOpen} member={member} />
      <HealthRecordSheet open={health.open} onOpenChange={health.setOpen} member={member} />
      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={confirmDelete.setOpen}
        title={tList("deleteTitle", { name })}
        description={tList("deleteBody")}
        confirmLabel={tList("delete")}
        destructive
        pending={deleteMember.isPending}
        onConfirm={() =>
          deleteMember.mutate(member.id, {
            onSuccess: () => {
              toast.success(tList("deleted", { name }));
              router.replace("/dashboard/members");
            },
            onError: (error) => {
              toastError(tList("deleteError", { name }), error);
              confirmDelete.setOpen(false);
            },
          })
        }
      />
    </div>
  );
}

/** /dashboard/members/[id]: one member's profile, history and health. */
export function MemberDetails() {
  const t = useTranslations("Members.details");
  const { id } = useParams<{ id: string }>();
  const memberId = Number(id);
  const valid = Number.isInteger(memberId) && memberId > 0;
  const member = useMember(memberId, valid);

  const notFound = !valid || (member.error instanceof ApiError && member.error.status === 404);

  if (notFound) {
    return (
      <Card>
        <EmptyState
          icon={UserX}
          title={t("notFoundTitle")}
          description={t("notFoundBody")}
          action={
            <Button asChild>
              <Link href="/dashboard/members">
                <ArrowLeft className="rtl:rotate-180" /> {t("backToList")}
              </Link>
            </Button>
          }
        />
      </Card>
    );
  }

  if (member.isError) {
    return (
      <QueryError
        title={t("loadError")}
        error={member.error}
        onRetry={() => void member.refetch()}
        retrying={member.isFetching}
      />
    );
  }

  if (member.isPending) return <DetailsSkeleton />;

  return <MemberProfile member={member.data} />;
}
