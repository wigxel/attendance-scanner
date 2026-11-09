"use client";

import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AppDataTable } from "@/components/DataTable";
import {
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { PurchaseSummary } from "@/convex/inventory";
import { purchaseColumns } from "./purchase-columns";

export function PurchasesContent() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const purchases = useQuery(api.inventory.listPurchases, {});

  const openPurchase = useCallback(
    (purchase: PurchaseSummary) => {
      router.push(`/admin/inventory/purchases/${purchase._id}`);
    },
    [router],
  );

  if (purchases === undefined) {
    return <Skeleton className="h-[60svh] w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Purchases</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            What you bought, from whom, and at what cost. A posted purchase can
            be voided but never edited.
          </p>
        </div>

        <Button asChild>
          <Link href="/admin/inventory/purchases/new">
            <Plus className="h-4 w-4" />
            Record purchase
          </Link>
        </Button>
      </div>

      <AppDataTable
        columns={purchaseColumns}
        data={purchases}
        onRowClick={openPurchase}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by supplier..."
        emptyState={
          <EmptyStateContent>
            <EmptyStateTitle>No purchases yet</EmptyStateTitle>
            <EmptyStateDescription>
              Record what you bought and the stock will follow.
            </EmptyStateDescription>
          </EmptyStateContent>
        }
      />
    </div>
  );
}
