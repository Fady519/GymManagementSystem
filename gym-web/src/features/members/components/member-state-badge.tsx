import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MemberMembershipState } from "@/types";

const STATE: Record<MemberMembershipState, { label: string; className: string }> = {
  Active: { label: "Active", className: "border-success/30 bg-success/15 text-success" },
  Frozen: {
    label: "Frozen",
    className: "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  Expired: {
    label: "Expired",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  None: { label: "No membership", className: "border-border bg-muted text-muted-foreground" },
};

export const MEMBER_STATES = Object.keys(STATE) as MemberMembershipState[];

export function memberStateLabel(state: MemberMembershipState) {
  return STATE[state].label;
}

/** A member's overall status (calculated by the API from their memberships). */
export function MemberStateBadge({
  state,
  className,
}: {
  state: MemberMembershipState;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(STATE[state].className, className)}>
      {STATE[state].label}
    </Badge>
  );
}
