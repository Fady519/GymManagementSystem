"use client";

import { useCallback } from "react";
import { Eye, RefreshCcw, Snowflake, Sun, XCircle } from "lucide-react";
import type { RowAction } from "@/components/data-table/row-actions";
import {
  CancelMembershipDialog,
  FreezeMembershipDialog,
  RenewMembershipDialog,
  UnfreezeMembershipDialog,
} from "@/features/memberships/components/membership-dialogs";
import { MembershipDetailsSheet } from "@/features/memberships/components/membership-details-sheet";
import { useDialogState } from "@/hooks/use-dialog-state";
import { Button } from "@/components/ui/button";
import type { MembershipResponse } from "@/types";

type Kind = "renew" | "freeze" | "unfreeze" | "cancel";

/** What can be done with a membership in each state (the API enforces the same rules). */
export function allowedActions(m: MembershipResponse): Kind[] {
  switch (m.state) {
    case "Active":
      return ["renew", "freeze", "cancel"];
    case "Frozen":
      return ["unfreeze", "renew", "cancel"];
    case "Upcoming":
      return ["cancel"];
    case "Expired":
      return ["renew"];
    default:
      return [];
  }
}

const META: Record<Kind, { label: string; icon: typeof Eye; destructive?: boolean }> = {
  renew: { label: "Renew", icon: RefreshCcw },
  freeze: { label: "Freeze", icon: Snowflake },
  unfreeze: { label: "Unfreeze", icon: Sun },
  cancel: { label: "Cancel membership", icon: XCircle, destructive: true },
};

/**
 * All the membership dialogs in one place, so any page can offer the same actions:
 *   const actions = useMembershipActions();
 *   actions.rowActions(m)  -> items for a table row menu
 *   actions.showDetails(m) -> opens the side panel
 *   {actions.dialogs}      -> render once in the page
 */
export function useMembershipActions() {
  const details = useDialogState<MembershipResponse>();
  const renew = useDialogState<MembershipResponse>();
  const freeze = useDialogState<MembershipResponse>();
  const unfreeze = useDialogState<MembershipResponse>();
  const cancel = useDialogState<MembershipResponse>();
  const { show: showDetails, setOpen: setDetailsOpen } = details;
  const { show: showRenew } = renew;
  const { show: showFreeze } = freeze;
  const { show: showUnfreeze } = unfreeze;
  const { show: showCancel } = cancel;

  const run = useCallback(
    (kind: Kind, membership: MembershipResponse) => {
      // The dialogs open on top of the details panel's page, not inside it.
      setDetailsOpen(false);
      ({ renew: showRenew, freeze: showFreeze, unfreeze: showUnfreeze, cancel: showCancel })[kind](
        membership,
      );
    },
    [setDetailsOpen, showRenew, showFreeze, showUnfreeze, showCancel],
  );

  const rowActions = useCallback(
    (membership: MembershipResponse): RowAction[] => [
      { label: "View details", icon: Eye, onSelect: () => showDetails(membership) },
      ...allowedActions(membership).map((kind) => ({
        label: META[kind].label,
        icon: META[kind].icon,
        destructive: META[kind].destructive,
        onSelect: () => run(kind, membership),
      })),
    ],
    [run, showDetails],
  );

  const detailsMembership = details.item;
  const dialogs = (
    <>
      <MembershipDetailsSheet
        open={details.open}
        onOpenChange={details.setOpen}
        membership={detailsMembership}
        actions={
          detailsMembership &&
          allowedActions(detailsMembership).map((kind) => {
            const Icon = META[kind].icon;
            return (
              <Button
                key={kind}
                type="button"
                size="sm"
                variant={
                  META[kind].destructive ? "outline" : kind === "renew" ? "default" : "outline"
                }
                className={
                  META[kind].destructive ? "text-destructive hover:text-destructive" : undefined
                }
                onClick={() => run(kind, detailsMembership)}
              >
                <Icon /> {META[kind].label}
              </Button>
            );
          })
        }
      />
      <RenewMembershipDialog
        open={renew.open}
        onOpenChange={renew.setOpen}
        membership={renew.item}
      />
      <FreezeMembershipDialog
        open={freeze.open}
        onOpenChange={freeze.setOpen}
        membership={freeze.item}
      />
      <UnfreezeMembershipDialog
        open={unfreeze.open}
        onOpenChange={unfreeze.setOpen}
        membership={unfreeze.item}
      />
      <CancelMembershipDialog
        open={cancel.open}
        onOpenChange={cancel.setOpen}
        membership={cancel.item}
      />
    </>
  );

  return { rowActions, showDetails, run, dialogs };
}
