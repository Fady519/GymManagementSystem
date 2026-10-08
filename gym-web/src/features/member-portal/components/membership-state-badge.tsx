import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MembershipState } from "@/types";

const STATE_CLASSES: Record<MembershipState, string> = {
  Active: "border-success/30 bg-success/15 text-success",
  Frozen: "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  Upcoming: "border-primary/30 bg-primary/10 text-primary",
  Expired: "border-border bg-muted text-muted-foreground",
  Cancelled: "border-destructive/30 bg-destructive/10 text-destructive",
};

/** A colored badge for a membership state, the same everywhere it appears. */
export function MembershipStateBadge({
  state,
  className,
}: {
  state: MembershipState;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(STATE_CLASSES[state], className)}>
      {state}
    </Badge>
  );
}
