"use client";

import { usePaginatedQuery } from "convex/react";
import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import Link from "next/link";
import { parseAsIsoDate, useQueryStates } from "nuqs";
import { useDeferredValue, useState } from "react";
import { AppDataTable } from "@/components/DataTable";
import {
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import {
  MetricsDateRange,
  type MetricsRange,
} from "@/components/inventory/metrics-date-range";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { SaleSummary } from "@/convex/inventory";
import { saleColumns } from "./sale-columns";
import { SaleDetailSheet } from "./sale-detail-sheet";

const PAGE_SIZE = 50;

export function SalesContent() {
  const [query, setQuery] = useQueryStates({
    sales_from: parseAsIsoDate,
    sales_to: parseAsIsoDate,
  });

  // No dates in the URL means all time: no bounds sent to the server.
  const range: MetricsRange | null =
    query.sales_from && query.sales_to
      ? {
          start: format(query.sales_from, "yyyy-MM-dd"),
          end: format(query.sales_to, "yyyy-MM-dd"),
        }
      : null;

  const setRange = (next: MetricsRange | null) =>
    setQuery(
      next
        ? { sales_from: parseISO(next.start), sales_to: parseISO(next.end) }
        : { sales_from: null, sales_to: null },
    );

  const [search, setSearch] = useState("");
  const debouncedSearch = useDeferredValue(search);

  const { results, status, loadMore } = usePaginatedQuery(
    api.inventory.listSales,
    {
      search: debouncedSearch.trim() || undefined,
      start: range?.start,
      end: range?.end,
    },
    { initialNumItems: PAGE_SIZE },
  );

  const [selected, setSelected] = useState<SaleSummary | null>(null);

  if (results === undefined) {
    return <Skeleton className="h-[60svh] w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Sales</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every receipt, with the products on it. A sale can be voided but
            never edited.
          </p>
        </div>

        <Button asChild>
          <Link href="/admin/inventory/sales/new">
            <Plus className="h-4 w-4" />
            Record sale
          </Link>
        </Button>
      </div>

      <MetricsDateRange value={range} onChange={setRange} />

      <AppDataTable
        columns={saleColumns}
        data={results}
        onRowClick={setSelected}
        searchTerm={debouncedSearch}
        onSearchChange={setSearch}
        searchPlaceholder="Search by product, customer or note..."
        isLoading={status === "LoadingMore"}
        hasMore={status === "CanLoadMore" || status === "LoadingMore"}
        onLoadMore={() => loadMore(PAGE_SIZE)}
        emptyState={
          <EmptyStateContent>
            <EmptyStateTitle>No sales yet</EmptyStateTitle>
            <EmptyStateDescription>
              Record a sale and the stock will follow.
            </EmptyStateDescription>
          </EmptyStateContent>
        }
      />

      <SaleDetailSheet
        saleId={selected?._id ?? null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
