"use client";

import { Fragment } from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type RowAction = {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** Red text and a line above it, for delete-like actions. */
  destructive?: boolean;
};

/**
 * The "⋯" menu at the end of a table row.
 * `label` is read by screen readers; pass one that names the row (e.g. "Actions for Sara Ali"),
 * otherwise a plain "Actions" in the site language is used.
 */
export function RowActions({ label, actions }: { label?: string; actions: RowAction[] }) {
  const t = useTranslations("DataTable");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label ?? t("rowActions")}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {actions.map((action, index) => (
          <Fragment key={action.label}>
            {action.destructive && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onSelect={action.onSelect}
              variant={action.destructive ? "destructive" : "default"}
            >
              <action.icon />
              {action.label}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
