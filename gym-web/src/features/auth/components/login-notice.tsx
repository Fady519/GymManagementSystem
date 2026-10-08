"use client";

import { useSearchParams } from "next/navigation";
import { CircleCheck, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * A message at the top of the login page, picked from the URL:
 *   ?expired=1    the session ran out (the app shell sends users here)
 *   ?reset=1      after /reset-password
 *   ?activated=1  after /set-password (invite)
 */
export function LoginNotice() {
  const t = useTranslations("Auth.notice");
  const params = useSearchParams();

  if (params.get("expired")) {
    return (
      <Alert className="mb-6">
        <Clock />
        <AlertDescription>{t("expired")}</AlertDescription>
      </Alert>
    );
  }

  const success = params.get("reset")
    ? t("reset")
    : params.get("activated")
      ? t("activated")
      : null;

  if (!success) return null;

  return (
    <Alert className="mb-6 border-success/40 text-success">
      <CircleCheck />
      <AlertDescription className="text-success">{success}</AlertDescription>
    </Alert>
  );
}
