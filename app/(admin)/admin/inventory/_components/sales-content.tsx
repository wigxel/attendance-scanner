"use client";

import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppDataTable } from "@/components/DataTable";
import {
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { SaleSummary } from "@/convex/inventory";
import { saleColumns } from "./sale-columns";
import { SaleDetailSheet } from "./sale-detail-sheet";

export function SalesContent() {
  const sales = useQuery(api.inventory.listSales, {});
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SaleSummary | null>(null);

  if (sales === undefined) {
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

      <AppDataTable
        columns={saleColumns}
        data={sales}
        onRowClick={setSelected}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by product, note or date..."
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
