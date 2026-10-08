"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { isolateLtr } from "@/lib/bidi";
import { downloadExport, type ExportName } from "@/lib/download";
import { toastError } from "@/lib/notify";
import type { ExportFormat } from "@/types";

type ParamValue = string | number | boolean | null | undefined;

// `key` points at the label and hint in Shared.export ("xlsx" + "xlsxHint", ...).
const FORMATS: { value: ExportFormat; key: "xlsx" | "csv"; icon: typeof FileText }[] = [
  { value: "Xlsx", key: "xlsx", icon: FileSpreadsheet },
  { value: "Csv", key: "csv", icon: FileText },
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
  /**
   * Plural noun for the messages, already translated and with "the" in Arabic,
   * e.g. "members" / "الأعضاء" ("Includes all members that match…").
   */
  itemLabel: string;
  disabled?: boolean;
}) {
  const t = useTranslations("Shared.export");
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const run = async (format: ExportFormat) => {
    setBusy(format);
    try {
      const fileName = await downloadExport(name, filters, format);
      // File names are Latin (e.g. members-2026-10-08.xlsx): keep them left-to-right in Arabic text.
      toast.success(t("ready"), { description: t("saved", { file: isolateLtr(fileName) }) });
    } catch (error) {
      toastError(t("failed", { items: itemLabel }), error);
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || busy !== null}>
          {busy ? <Loader2 className="animate-spin" /> : <Download />}
          {busy ? t("preparing") : t("button")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {t("includes", { items: itemLabel })}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {FORMATS.map((format) => (
          <DropdownMenuItem key={format.value} onSelect={() => void run(format.value)}>
            <format.icon />
            <div className="flex flex-col">
              <span>{t(format.key)}</span>
              <span className="text-xs text-muted-foreground">{t(`${format.key}Hint`)}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
