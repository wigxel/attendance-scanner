"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AppDataTable } from "@/components/DataTable";
import {
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { currencyFormatter } from "@/lib/currency.helpers";
import { purchaseLineColumns } from "./purchase-line-columns";

function formatKobo(value: number) {
  return currencyFormatter.format(value / 100);
}

type PurchaseDetailContentProps = {
  purchaseId: string;
};

export function PurchaseDetailContent({
  purchaseId,
}: PurchaseDetailContentProps) {
  const detail = useQuery(api.inventory.purchaseDetail, { purchaseId });
  const voidPurchase = useMutation(api.inventory.voidPurchase);
  const [search, setSearch] = useState("");

  if (detail === undefined) {
    return <Skeleton className="h-[60svh] w-full" />;
  }

  if (detail === null) {
    return (
      <EmptyStateContent>
        <EmptyStateTitle>Purchase not found</EmptyStateTitle>
        <EmptyStateDescription>
          It may have been removed. Go back to the purchases list.
        </EmptyStateDescription>
      </EmptyStateContent>
    );
  }

  const { purchase, supplier, lines, outstandingKobo } = detail;

  const handleVoid = async () => {
    const ok = window.confirm(
      "Void this purchase? Stock goes back and the previous average cost is restored.",
    );
    if (!ok) return;

    try {
      await voidPurchase({ purchaseId });
      toast.success("Purchase voided");
    } catch (error) {
      toast.error("Could not void purchase", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/inventory/purchases"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Purchases
          </Link>
          <h2 className="text-lg font-medium text-foreground">
            {supplier?.name ?? "Purchase without supplier"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(purchase.occurredAt).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={purchase.voided ? "secondary" : "default"}>
            {purchase.voided ? "Voided" : "Posted"}
          </Badge>
          {!purchase.voided && (
            <Button variant="destructive" onClick={handleVoid}>
              Void purchase
            </Button>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border p-4 text-sm md:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Total</dt>
          <dd className="font-medium">{formatKobo(purchase.totalKobo)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Amount paid</dt>
          <dd className="font-medium">{formatKobo(purchase.amountPaidKobo)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Outstanding</dt>
          <dd className="font-medium">{formatKobo(outstandingKobo)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Freight / discount</dt>
          <dd className="font-medium">
            {formatKobo(purchase.freightKobo ?? 0)} /{" "}
            {formatKobo(purchase.discountKobo ?? 0)}
          </dd>
        </div>
      </dl>

      {purchase.note && (
        <p className="text-sm text-muted-foreground">{purchase.note}</p>
      )}

      <AppDataTable
        columns={purchaseLineColumns}
        data={lines}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by product..."
        emptyState={
          <EmptyStateContent>
            <EmptyStateTitle>No lines</EmptyStateTitle>
            <EmptyStateDescription>
              This purchase has no line items.
            </EmptyStateDescription>
          </EmptyStateContent>
        }
      />
    </div>
  );
}
