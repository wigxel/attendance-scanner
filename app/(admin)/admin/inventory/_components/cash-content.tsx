"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import { parseAsIsoDate, useQueryStates } from "nuqs";
import { useDeferredValue, useState } from "react";
import {
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import type { MetricsRange } from "@/components/inventory/metrics-date-range";
import { RecordWithdrawalDialog } from "@/components/inventory/record-withdrawal-dialog";
import { StdTable } from "@/components/std-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { formatKobo } from "@/lib/currency.helpers";
import { cashColumns } from "./cash-columns";

const PAGE_SIZE = 100;

export function CashContent() {
  const [query, setQuery] = useQueryStates({
    cash_from: parseAsIsoDate,
    cash_to: parseAsIsoDate,
  });

  // No dates in the URL defaults to today, like the sales history.
  const today = format(new Date(), "yyyy-MM-dd");
  const range: MetricsRange | null =
    query.cash_from && query.cash_to
      ? {
          start: format(query.cash_from, "yyyy-MM-dd"),
          end: format(query.cash_to, "yyyy-MM-dd"),
        }
      : { start: today, end: today };

  const setRange = (next: MetricsRange | null) =>
    setQuery(
      next
        ? { cash_from: parseISO(next.start), cash_to: parseISO(next.end) }
        : { cash_from: null, cash_to: null },
    );

  const [search, setSearch] = useState("");
  const debouncedSearch = useDeferredValue(search);

  const overview = useQuery(api.inventory.cashOverview, {
    start: range.start,
    end: range.end,
  });

  const { results, status, loadMore } = usePaginatedQuery(
    api.inventory.listCashWithdrawals,
    {
      search: debouncedSearch.trim() || undefined,
      start: range.start,
      end: range.end,
    },
    { initialNumItems: PAGE_SIZE },
  );

  const [dialogOpen, setDialogOpen] = useState(false);

  if (overview === undefined || results === undefined) {
    return <Skeleton className="h-[60svh] w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Cash</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track cash withdrawals and current cash in hand.
          </p>
        </div>

        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Record withdrawal
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardDescription>Cash in-hand</CardDescription>
              <p className="text-3xl font-semibold tabular-nums">
                {formatKobo(overview.cashInHandKobo)}
              </p>
            </div>
            <div className="text-right">
              <CardDescription>Withdrawn in selected range</CardDescription>
              <p className="text-sm tabular-nums">
                {formatKobo(overview.withdrawnInRangeKobo)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <StdTable.Root
        columns={cashColumns()}
        data={results}
        searchTerm={debouncedSearch}
        onSearchChange={setSearch}
        isLoading={status === "LoadingMore"}
        hasMore={status === "CanLoadMore" || status === "LoadingMore"}
        onLoadMore={() => loadMore(PAGE_SIZE)}
      >
        <StdTable.Card>
          <StdTable.Header>
            <StdTable.SearchInput placeholder="Search by note..." />
            <StdTable.DateRange
              value={range}
              onChange={setRange}
              allowAllTime={false}
            />
            <StdTable.ColumnSelector />
          </StdTable.Header>

          <StdTable.CardBody
            emptyState={
              <EmptyStateContent>
                <EmptyStateTitle>No withdrawals yet</EmptyStateTitle>
                <EmptyStateDescription>
                  Record a withdrawal and it will show up here.
                </EmptyStateDescription>
              </EmptyStateContent>
            }
          />

          <StdTable.Footer>
            <StdTable.LoadMore />
          </StdTable.Footer>
        </StdTable.Card>
      </StdTable.Root>

      <RecordWithdrawalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cashInHandKobo={overview.cashInHandKobo}
      />
    </div>
  );
}
