import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

/** Shown while the app checks the session or moves the user to the right page. */
export function LoadingScreen({ label }: { label?: string }) {
  const t = useTranslations("Common");

  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm" role="status">
        {label ?? t("loadingAccount")}
      </p>
    </div>
  );
}
