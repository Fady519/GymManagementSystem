"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormat } from "@/hooks/use-format";
import { PAGE_SIZES } from "@/hooks/use-list-params";

type DataTablePaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  /**
   * Plural name of the rows, already translated, e.g. "members". English shows it after the
   * total ("of 132 members"); Arabic leaves it out ("من أصل 132"), because the noun's form
   * would have to change with the number.
   */
  itemLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizes?: readonly number[];
};

/** The footer under a server-paged table: "Showing 21–40 of 132", rows per page, and page buttons. */
export function DataTablePagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  itemLabel = "",
  onPageChange,
  onPageSizeChange,
  pageSizes = PAGE_SIZES,
}: DataTablePaginationProps) {
  const t = useTranslations("DataTable");
  const f = useFormat();
  if (totalCount === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalCount);
  const lastPage = Math.max(totalPages, 1);

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">
        {t.rich("showing", {
          first: f.number(first),
          last: f.number(last),
          total: f.number(totalCount),
          items: itemLabel,
          b: (chunks) => <span className="font-medium text-foreground tabular-nums">{chunks}</span>,
        })}
      </p>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t("rowsPerPage")}</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger size="sm" className="w-18" aria-label={t("rowsPerPage")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {f.number(size)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <span className="me-2 text-muted-foreground tabular-nums">
            {t("page", { page: f.number(page), pages: f.number(lastPage) })}
          </span>
          {/* Arrows point "back" and "forward" in the reading direction, so they flip in Arabic. */}
          <Button
            variant="outline"
            size="icon"
            className="hidden sm:inline-flex"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label={t("firstPage")}
          >
            <ChevronsLeft className="rtl:rotate-180" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label={t("previousPage")}
          >
            <ChevronLeft className="rtl:rotate-180" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= lastPage}
            aria-label={t("nextPage")}
          >
            <ChevronRight className="rtl:rotate-180" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden sm:inline-flex"
            onClick={() => onPageChange(lastPage)}
            disabled={page >= lastPage}
            aria-label={t("lastPage")}
          >
            <ChevronsRight className="rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </div>
  );
}
