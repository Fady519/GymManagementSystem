"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  createColumnHelper,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Extra settings a column can have (TanStack calls them "meta"). */
export type DataColumnMeta = {
  /** The API's sort key for this column. When set (and the table has `sort`), the header is a sort button. */
  sortKey?: string;
  /** Classes for this column's header and cells, e.g. "text-end" or "hidden md:table-cell". */
  className?: string;
};

/**
 * TanStack Table v9 asks which features a table uses. We use none of its built-in features:
 * paging, sorting and searching happen on the server (the URL holds the state, the API does
 * the work), so the table only turns rows + column definitions into cells.
 */
const dataTableFeatures = tableFeatures({ columnMeta: {} as DataColumnMeta });
type Features = typeof dataTableFeatures;

/** Typed helper for writing a table's columns: `const col = createColumns<MemberListItem>()`. */
export function createColumns<TData extends RowData>() {
  return createColumnHelper<Features, TData>();
}

// Each column has its own value type (string, number...), so the list of columns needs `any` here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataColumns<TData extends RowData> = ColumnDef<Features, TData, any>[];

export type SortState = { key: string; desc: boolean };

type DataTableProps<TData extends RowData> = {
  /** Read by screen readers, e.g. "Members". */
  label: string;
  columns: DataColumns<TData>;
  /** undefined while the first page is loading. */
  data: TData[] | undefined;
  getRowId: (row: TData) => string;
  /** True on the very first load: shows skeleton rows. */
  isPending: boolean;
  /** True while a new page/filter is loading: the old rows stay visible but dimmed. */
  isFetching?: boolean;
  /** Shown instead of the rows when the list is empty. */
  emptyState: React.ReactNode;
  sort?: SortState;
  onSortChange?: (key: string) => void;
  /** Makes the whole row clickable (e.g. open the details page). */
  onRowClick?: (row: TData) => void;
  /** Usually <DataTablePagination />. */
  footer?: React.ReactNode;
  skeletonRows?: number;
};

// One shared empty array: a new [] on every render would make the table rebuild its rows each time.
const NO_ROWS: never[] = [];

/** Clicks on these (or inside them) do their own thing and must not also open the row. */
const INTERACTIVE =
  "a, button, input, label, [role='menuitem'], [role='switch'], [role='checkbox']";

/**
 * The one table used by every admin list: skeleton on first load, dimmed rows while
 * refetching, an empty state, sortable headers and an optional pagination footer.
 */
export function DataTable<TData extends RowData>({
  label,
  columns,
  data,
  getRowId,
  isPending,
  isFetching = false,
  emptyState,
  sort,
  onSortChange,
  onRowClick,
  footer,
  skeletonRows = 8,
}: DataTableProps<TData>) {
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: data ?? NO_ROWS,
    getRowId: (row) => getRowId(row),
  });

  const rows = table.getRowModel().rows;
  const columnCount = columns.length;

  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>, row: TData) => {
    const target = event.target as HTMLElement;
    // React events bubble through portals (menus, dialogs), so ignore clicks that didn't
    // happen inside this row's own DOM, and clicks on buttons/links inside the row.
    if (!event.currentTarget.contains(target) || target.closest(INTERACTIVE)) return;
    onRowClick?.(row);
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table aria-label={label} aria-busy={isPending || isFetching}>
        <TableHeader className="bg-muted/40">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => {
                const meta = header.column.columnDef.meta;
                const sortKey = meta?.sortKey;
                const sortable = Boolean(sortKey && sort && onSortChange);
                const active = sortable && sort?.key === sortKey;
                const SortIcon = !active ? ArrowUpDown : sort?.desc ? ArrowDown : ArrowUp;

                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "h-11 text-xs font-semibold tracking-wide uppercase",
                      meta?.className,
                    )}
                    aria-sort={active ? (sort?.desc ? "descending" : "ascending") : undefined}
                  >
                    {header.isPlaceholder ? null : sortable ? (
                      <button
                        type="button"
                        onClick={() => onSortChange?.(sortKey!)}
                        className={cn(
                          "-ms-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 uppercase transition-colors hover:bg-muted hover:text-foreground",
                          active && "text-foreground",
                        )}
                      >
                        <table.FlexRender header={header} />
                        <SortIcon className={cn("size-3.5", !active && "opacity-50")} />
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody className={cn("transition-opacity", isFetching && !isPending && "opacity-60")}>
          {isPending ? (
            Array.from({ length: skeletonRows }, (_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                {Array.from({ length: columnCount }, (_, j) => (
                  <TableCell key={j} className="py-3.5">
                    <Skeleton className={cn("h-4", j === 0 ? "w-40" : "w-20")} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columnCount} className="p-0">
                {emptyState}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={onRowClick ? (event) => handleRowClick(event, row.original) : undefined}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {row.getAllCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn("py-3", cell.column.columnDef.meta?.className)}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {footer}
    </div>
  );
}
