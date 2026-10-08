"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZES } from "@/hooks/use-list-params";

type DataTablePaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  /** Plural name of the rows, e.g. "members". */
  itemLabel: string;
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
  itemLabel,
  onPageChange,
  onPageSizeChange,
  pageSizes = PAGE_SIZES,
}: DataTablePaginationProps) {
  if (totalCount === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalCount);
  const lastPage = Math.max(totalPages, 1);

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">
        Showing <span className="font-medium text-foreground tabular-nums">{first}</span>–
        <span className="font-medium text-foreground tabular-nums">{last}</span> of{" "}
        <span className="font-medium text-foreground tabular-nums">{totalCount}</span> {itemLabel}
      </p>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger size="sm" className="w-18" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <span className="me-2 text-muted-foreground tabular-nums">
            Page {page} of {lastPage}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="hidden sm:inline-flex"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label="First page"
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= lastPage}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden sm:inline-flex"
            onClick={() => onPageChange(lastPage)}
            disabled={page >= lastPage}
            aria-label="Last page"
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
