"use client";

import { useState } from "react";
import { Check, Copy, Lock, RefreshCw, ShieldCheck, Sun, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { useAuth } from "@/features/auth/hooks";
import { MembershipStateBadge } from "@/features/member-portal/components/membership-state-badge";
import {
  useMyMemberships,
  useMyQrCode,
  useRegenerateQrCode,
} from "@/features/member-portal/queries";
import { toastError } from "@/lib/notify";
import { cn } from "@/lib/utils";

/**
 * The member's personal check-in QR code (GET /api/me/qr). The front desk scans it on the
 * check-in screen; the code is also printed under the QR so it can be typed in if the camera fails.
 */
export function MemberQrCard() {
  const t = useTranslations("MemberPortal.qr");
  const { user } = useAuth();
  const qr = useMyQrCode();
  const memberships = useMyMemberships();
  const regenerate = useRegenerateQrCode();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // The membership that decides if the door opens today (active or frozen), if any.
  const current = memberships.data?.find((m) => m.state === "Active" || m.state === "Frozen");

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(t("copied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const onRegenerate = async () => {
    try {
      await regenerate.mutateAsync();
      toast.success(t("regenerated"), { description: t("regeneratedBody") });
    } catch (error) {
      toastError(t("regenerateError"), error);
    } finally {
      setConfirmOpen(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {qr.isPending ? (
        <Skeleton className="h-[30rem] rounded-2xl" />
      ) : qr.isError ? (
        <QueryError
          title={t("loadError")}
          error={qr.error}
          onRetry={() => void qr.refetch()}
          retrying={qr.isFetching}
        />
      ) : (
        <Card className="overflow-hidden rounded-2xl py-0">
          <div className="bg-gradient-to-br from-primary to-indigo-900 px-6 py-5 text-primary-foreground">
            <p className="text-xs font-semibold tracking-widest text-white/70 uppercase">
              {t("codeLabel")}
            </p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="truncate text-lg font-bold">{user?.fullName}</p>
              {current && (
                <MembershipStateBadge
                  state={current.state}
                  className="border-white/30 bg-white/15 text-white"
                />
              )}
            </div>
          </div>

          <CardContent className="flex flex-col items-center gap-5 py-6">
            {/* Always black on white (even in dark mode): scanners read high contrast best. */}
            <div
              className={cn(
                "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-border",
                regenerate.isPending && "opacity-40",
              )}
            >
              <QRCodeSVG
                value={qr.data.code}
                size={232}
                level="M"
                marginSize={1}
                role="img"
                aria-label={t("qrLabel")}
              />
            </div>

            {/* The same code as text, for typing it in when the camera can't read the screen. */}
            <div className="flex w-full items-center justify-center gap-2">
              <code
                dir="ltr"
                className="max-w-full rounded-lg bg-muted px-4 py-2 text-center font-mono text-base font-bold tracking-widest break-all select-all sm:text-lg"
              >
                {qr.data.code}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void copy(qr.data.code)}
                aria-label={t("copy")}
              >
                {copied ? <Check className="text-success" /> : <Copy />}
              </Button>
            </div>

            <ul className="w-full space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                {current ? (
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                )}
                {t("membershipNote")}
              </li>
              <li className="flex gap-2">
                <Sun className="mt-0.5 size-4 shrink-0" /> {t("tipBrightness")}
              </li>
              <li className="flex gap-2">
                <Lock className="mt-0.5 size-4 shrink-0" /> {t("tipPrivate")}
              </li>
            </ul>

            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setConfirmOpen(true)}
              disabled={regenerate.isPending}
            >
              <RefreshCw className={regenerate.isPending ? "animate-spin" : undefined} />
              {t("regenerate")}
            </Button>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("regenerateTitle")}
        description={t("regenerateBody")}
        confirmLabel={t("regenerateConfirm")}
        pending={regenerate.isPending}
        onConfirm={() => void onRegenerate()}
      />
    </div>
  );
}
