"use client";

import { RefreshCw, ServerCrash } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api-error";

type QueryErrorProps = {
  title: string;
  error: Error;
  onRetry: () => void;
  retrying: boolean;
};

/** The error state for any section that loads data: what failed, why, and a working retry button. */
export function QueryError({ title, error, onRetry, retrying }: QueryErrorProps) {
  const t = useTranslations("Common");
  return (
    <Alert variant="destructive">
      <ServerCrash />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {/* The reason in the visitor's language, worked out from the API error code. */}
        <p>{apiErrorMessage(error)}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry} disabled={retrying}>
          <RefreshCw className={retrying ? "animate-spin" : undefined} /> {t("retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
