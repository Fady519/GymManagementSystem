"use client";

import { RefreshCw, ServerCrash } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type QueryErrorProps = {
  title: string;
  error: Error;
  onRetry: () => void;
  retrying: boolean;
};

/** The error state for any section that loads data: what failed, why, and a working retry button. */
export function QueryError({ title, error, onRetry, retrying }: QueryErrorProps) {
  return (
    <Alert variant="destructive">
      <ServerCrash />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry} disabled={retrying}>
          <RefreshCw className={retrying ? "animate-spin" : undefined} /> Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}
