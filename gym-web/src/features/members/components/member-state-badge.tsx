import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MemberMembershipState } from "@/types";

/** Badge colors per state (the label comes from the "Enums" messages). */
const STATE_CLASSES: Record<MemberMembershipState, string> = {
  Active: "border-success/30 bg-success/15 text-success",
  Frozen: "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  Expired: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  None: "border-border bg-muted text-muted-foreground",
};

export const MEMBER_STATES = Object.keys(STATE_CLASSES) as MemberMembershipState[];

/** A member's overall status (calculated by the API from their memberships). */
export function MemberStateBadge({
  state,
  className,
}: {
  state: MemberMembershipState;
  className?: string;
}) {
  const t = useTranslations("Enums.MemberMembershipState");
  return (
    <Badge variant="outline" className={cn(STATE_CLASSES[state], className)}>
      {t(state)}
    </Badge>
  );
}
