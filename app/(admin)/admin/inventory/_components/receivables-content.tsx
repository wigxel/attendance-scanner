"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";
import { useState } from "react";
import { AppDataTable } from "@/components/DataTable";
import {
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Receivable } from "@/convex/inventory";
import { formatKobo } from "@/lib/currency.helpers";
import { CustomerDebtSheet } from "./customer-debt-sheet";
import { receivablesColumns } from "./receivables-columns";

export function ReceivablesContent() {
  // Overdue is judged against the day the screen is opened.
  const today = format(new Date(), "yyyy-MM-dd");
  const receivables = useQuery(api.inventory.receivables, { today });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Receivable | null>(null);

  if (receivables === undefined) {
    return <Skeleton className="h-[60svh] w-full" />;
  }

  const totalOwedKobo = receivables.reduce(
    (sum, row) => sum + row.totalOwedKobo,
    0,
  );
  const overdueKobo = receivables.reduce(
    (sum, row) => sum + row.overdueKobo,
    0,
  );
  const lateCount = receivables.filter((row) => row.overdueKobo > 0).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium text-foreground">Receivables</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Who owes what, oldest debts first.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end justify-between gap-3 pt-4">
          <div>
            <CardDescription>Total owed</CardDescription>
            <p className="text-3xl font-semibold tabular-nums">
              {formatKobo(totalOwedKobo)}
            </p>
          </div>
          <div className="text-right">
            <CardDescription>Overdue</CardDescription>
            <p className="text-sm tabular-nums">
              {formatKobo(overdueKobo)}
              {lateCount > 0
                ? ` · ${lateCount} ${lateCount === 1 ? "customer" : "customers"} past due`
                : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      <AppDataTable
        columns={receivablesColumns}
        data={receivables}
        onRowClick={setSelected}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by customer name or id..."
        emptyState={
          <EmptyStateContent>
            <EmptyStateTitle>No one owes anything.</EmptyStateTitle>
            <EmptyStateDescription>
              A credit sale with a balance left on it will show up here.
            </EmptyStateDescription>
          </EmptyStateContent>
        }
      />

      <CustomerDebtSheet
        customer={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
