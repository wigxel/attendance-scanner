"use client";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  type Table as TanStackTable,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import * as React from "react";
import {
  MetricsDateRange,
  type MetricsRange,
} from "@/components/inventory/metrics-date-range";
import { AppSpinner } from "@/components/loader";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmptyState,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "./empty-state";
import { CardContent, Card as UICard } from "./ui/card";

export type LoadMoreState = {
  canNextPage: boolean;
  hasMore?: boolean;
  isLoading?: boolean;
};

export function shouldLoadMore(state: LoadMoreState) {
  return !state.canNextPage && Boolean(state.hasMore) && !state.isLoading;
}

type StdTableContextValue = {
  table: TanStackTable<any>;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
};

const StdTableContext = React.createContext<StdTableContextValue | null>(null);

function useStdTable() {
  const ctx = React.useContext(StdTableContext);
  if (!ctx) {
    throw new Error(
      "StdTable.* components must be used inside <StdTable.Root>",
    );
  }
  return ctx;
}

/**
 * Composition-API data table. Root owns the TanStack table instance and the
 * query-facing state; the other parts render pieces of it:
 *
 * <StdTable.Root columns={cols} data={rows} ...>
 *   <StdTable.Card>
 *     <StdTable.Header>
 *       <StdTable.SearchInput placeholder="..." />
 *       <StdTable.DateRange value={range} onChange={setRange} />
 *       <StdTable.ColumnSelector />
 *     </StdTable.Header>
 *     <StdTable.CardBody onRowClick={...} emptyState={...} />
 *     <StdTable.Footer>
 *       <StdTable.Pagination />  // client-side paging (Root needs pageSize)
 *       <StdTable.LoadMore />    // server paging (Root needs hasMore/onLoadMore)
 *     </StdTable.Footer>
 *   </StdTable.Card>
 * </StdTable.Root>
 *
 * Without a `pageSize`, Root renders every row it is given — server pagination
 * (`LoadMore`) controls what is visible. With a `pageSize`, rows are sliced
 * client-side and driven by `StdTable.Pagination`.
 */
export const StdTable = {
  Root,
  Card,
  Header,
  Footer,
  CardBody,
  SearchInput,
  DateRange,
  Pagination,
  LoadMore,
  ColumnSelector,
};

function Root<T>({
  columns,
  data,
  searchTerm,
  onSearchChange,
  isLoading,
  hasMore,
  onLoadMore,
  pageSize,
  children,
}: {
  columns: ColumnDef<T>[];
  data: T[];
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  /** Enables client-side paging; pair with <StdTable.Pagination />. */
  pageSize?: number;
  children: React.ReactNode;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    // Without a pageSize everything renders as one page.
    pageSize: pageSize ?? Number.MAX_SAFE_INTEGER,
  });

  // A new search shrinks the row count; a stale page index would show a blank table.
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchTerm]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: pageSize ? getPaginationRowModel() : undefined,
    state: { sorting, columnVisibility, pagination },
  });

  const ctx = React.useMemo(
    () => ({
      table,
      searchTerm,
      onSearchChange,
      isLoading,
      hasMore,
      onLoadMore,
    }),
    [table, searchTerm, onSearchChange, isLoading, hasMore, onLoadMore],
  );

  return (
    <StdTableContext.Provider value={ctx}>{children}</StdTableContext.Provider>
  );
}

/** The card shell the table lives in. */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <UICard className="w-full">
      <CardContent className="flex flex-col px-4 pb-0 min-h-[60svh]">
        {children}
      </CardContent>
    </UICard>
  );
}

/** Control strip above the table; search, date range, column selector go here. */
function Header({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center py-4 gap-2">{children}</div>;
}

/** Strip below the table; pagination and load-more go here. */
function Footer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2 py-4">
      {children}
    </div>
  );
}

/** Renders the rows the table currently holds, with the empty-state row. */
function CardBody({
  onRowClick,
  emptyState,
  searchTerm,
  onSearchChange,
}: {
  onRowClick?: (row: any) => void;
  emptyState?: React.ReactNode;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}) {
  const {
    table,
    searchTerm: ctxSearch,
    onSearchChange: ctxSearchChange,
  } = useStdTable();
  const search = searchTerm ?? ctxSearch;
  const searchChange = onSearchChange ?? ctxSearchChange;
  const rows = table.getRowModel().rows;
  const searchActive = Boolean(search?.trim());

  return (
    <EmptyState isEmpty={rows.length === 0}>
      <div className="rounded-md border flex-1">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-muted-foreground">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className={onRowClick ? "cursor-pointer" : ""}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow>
              <TableCell
                colSpan={table.getAllLeafColumns().length}
                className="text-center"
              >
                <EmptyStateContent className="py-24">
                  {searchActive && searchChange ? (
                    <>
                      <EmptyStateTitle>
                        No results matching &ldquo;
                        {search}
                        &rdquo;
                      </EmptyStateTitle>
                      <EmptyStateDescription>
                        <button
                          type="button"
                          onClick={() => searchChange("")}
                          className="underline underline-offset-2 cursor-pointer hover:text-foreground"
                        >
                          Clear search
                        </button>
                      </EmptyStateDescription>
                    </>
                  ) : (
                    (emptyState ?? (
                      <EmptyStateTitle>No results</EmptyStateTitle>
                    ))
                  )}
                </EmptyStateContent>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </EmptyState>
  );
}

/** Controlled search box wired to Root; spinner overlays while loading. */
function SearchInput({ placeholder }: { placeholder: string }) {
  const { searchTerm, onSearchChange, isLoading } = useStdTable();

  return (
    <div className="relative max-w-sm">
      <Input
        placeholder={placeholder}
        value={searchTerm ?? ""}
        onChange={(event) => onSearchChange?.(event.target.value)}
        className="bg-white pr-10"
      />
      {isLoading && (
        <AppSpinner className="absolute right-3 top-1/2 -translate-y-1/2 " />
      )}
    </div>
  );
}

/** Date-range control for the header. */
function DateRange(props: {
  value: MetricsRange | null;
  onChange: (next: MetricsRange | null) => void;
  allowAllTime?: boolean;
}) {
  return (
    <MetricsDateRange
      value={props.value}
      onChange={props.onChange}
      allowAllTime={props.allowAllTime}
    />
  );
}

/** Client-side pager over the rows Root already holds. Needs Root pageSize. */
function Pagination() {
  const { table } = useStdTable();

  return (
    <>
      <div className="text-muted-foreground flex-1 text-sm">
        Page {table.getState().pagination.pageIndex + 1} of{" "}
        {Math.max(1, table.getPageCount())}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </>
  );
}

/**
 * Server pagination. Renders a "Load more" button that appends the next server
 * page. With `auto`, the button is hidden and the next page is fetched
 * automatically once the last local page is reached (pair with Pagination).
 */
function LoadMore({ auto = false }: { auto?: boolean }) {
  const { table, hasMore, isLoading, onLoadMore } = useStdTable();

  const shouldFetchNextPage = shouldLoadMore({
    canNextPage: table.getCanNextPage(),
    hasMore,
    isLoading,
  });

  // onLoadMore changes identity each render; only refetch when the gate flips.
  React.useEffect(() => {
    if (auto && shouldFetchNextPage) onLoadMore?.();
  }, [auto, shouldFetchNextPage, onLoadMore]);

  if (auto || !hasMore) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onLoadMore}
      disabled={isLoading}
    >
      {isLoading ? "Loading…" : "Load more"}
    </Button>
  );
}

/** Column visibility dropdown. */
function ColumnSelector() {
  const { table } = useStdTable();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="ml-auto">
          Columns <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="capitalize"
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
