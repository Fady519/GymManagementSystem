import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CheckInDenyReason, CheckInResult } from "@/types";

/** Short reason labels for the log and the result screen. */
export const DENY_REASON_LABEL: Record<CheckInDenyReason, string> = {
  NoMembership: "No membership",
  MembershipExpired: "Membership expired",
  MembershipFrozen: "Membership frozen",
  MembershipNotStarted: "Not started yet",
  AlreadyCheckedInToday: "Already checked in today",
};

export const CHECK_IN_RESULTS: { value: CheckInResult; label: string }[] = [
  { value: "Allowed", label: "Let in" },
  { value: "Denied", label: "Turned away" },
];

/** Green "Let in" or red "Turned away" pill. */
export function CheckInResultBadge({
  result,
  className,
}: {
  result: CheckInResult;
  className?: string;
}) {
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
      {allowed ? "Let in" : "Turned away"}
    </Badge>
  );
}
