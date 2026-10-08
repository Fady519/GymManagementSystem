"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadExport, type ExportName } from "@/lib/download";
import { toastError } from "@/lib/notify";
import type { ExportFormat } from "@/types";

type ParamValue = string | number | boolean | null | undefined;

const FORMATS: { value: ExportFormat; label: string; hint: string; icon: typeof FileText }[] = [
  {
    value: "Xlsx",
    label: "Excel workbook",
    hint: "Formatted, ready to filter",
    icon: FileSpreadsheet,
  },
  { value: "Csv", label: "CSV file", hint: "For other tools and imports", icon: FileText },
];

/**
 * "Export" button for list pages. It sends the SAME filters the page is showing, so the file
 * matches the table (all pages, not only the visible one).
 */
export function ExportButton({
  name,
  filters,
  itemLabel,
  disabled = false,
}: {
  name: ExportName;
  /** The page's current filters, with the API's parameter names (e.g. { state: "Active" }). */
  filters: Record<string, ParamValue>;
  /** Plural noun for the messages, e.g. "members". */
  itemLabel: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const run = async (format: ExportFormat) => {
    setBusy(format);
    try {
      const fileName = await downloadExport(name, filters, format);
      toast.success("Export ready", { description: `${fileName} was saved to your downloads.` });
    } catch (error) {
      toastError(`We couldn't export the ${itemLabel}`, error);
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || busy !== null}>
          {busy ? <Loader2 className="animate-spin" /> : <Download />}
          {busy ? "Preparing…" : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Includes all {itemLabel} that match the current filters, not just this page.
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {FORMATS.map((format) => (
          <DropdownMenuItem key={format.value} onSelect={() => void run(format.value)}>
            <format.icon />
            <div className="flex flex-col">
              <span>{format.label}</span>
              <span className="text-xs text-muted-foreground">{format.hint}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
