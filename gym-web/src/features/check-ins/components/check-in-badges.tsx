import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CheckInResult } from "@/types";

/**
 * The two results the API can return (fixed English values). Their labels, and the deny reason
 * labels, are in the messages: Enums.CheckInResult.* and Enums.CheckInDenyReason.*.
 */
export const CHECK_IN_RESULTS: readonly CheckInResult[] = ["Allowed", "Denied"];

/** Green "Allowed" or red "Denied" pill. */
export function CheckInResultBadge({
  result,
  className,
}: {
  result: CheckInResult;
  className?: string;
}) {
  const t = useTranslations("Enums.CheckInResult");
  const allowed = result === "Allowed";
  const Icon = allowed ? CheckCircle2 : XCircle;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        allowed
          ? "border-success/30 bg-success/10 text-success"
          : "border-destructive/30 bg-destructive/10 text-destructive",
        className,
      )}
    >
      <Icon className="size-3" />
      {t(result)}
    </Badge>
  );
}
