"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { AppDataTable } from "@/components/DataTable";
import {
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Receivable } from "@/convex/inventory";
import { CustomerDebtSheet } from "./customer-debt-sheet";
import { receivablesColumns } from "./receivables-columns";

export function ReceivablesContent() {
  const receivables = useQuery(api.inventory.receivables, {});
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Receivable | null>(null);

  if (receivables === undefined) {
    return <Skeleton className="h-[60svh] w-full" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium text-foreground">Receivables</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Who owes what, with the oldest unpaid sale on top.
        </p>
      </div>

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
