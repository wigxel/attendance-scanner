"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { SaleDetailSheet } from "@/app/(admin)/admin/inventory/_components/sale-detail-sheet";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import { movementKindLabels } from "@/components/forms/StockMovementForm";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

type MovementHistorySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: {
    productId: string;
    name: string;
    baseUnitName: string;
    baseUnitAbbreviation?: string;
  } | null;
};

/** The note cell for a sale-linked movement; clicking opens the sale. */
function SaleNoteButton({
  saleId,
  customerName,
  isVoid,
  onOpen,
}: {
  saleId: string;
  customerName: string | null;
  isVoid: boolean;
  onOpen: (saleId: string) => void;
}) {
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-auto p-0 text-muted-foreground hover:text-foreground"
      onClick={() => onOpen(saleId)}
    >
      {isVoid ? "Void" : "Sale"} — {customerName ?? "unknown customer"}{" "}
      <span className="font-mono text-[10px]">({saleId})</span>
    </Button>
  );
}

export function MovementHistorySheet({
  open,
  onOpenChange,
  product,
}: MovementHistorySheetProps) {
  const movements = useQuery(
    api.inventory.productMovements,
    product ? { productId: product.productId } : "skip",
  );
  const [saleId, setSaleId] = useState<string | null>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{product ? product.name : "Stock changes"}</SheetTitle>
          <SheetDescription>
            The last 20 stock changes, newest first. The ledger is the audit
            trail.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6">
          {!movements ? (
            <div className="space-y-3">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : (
            <EmptyState isEmpty={movements.length === 0}>
              <EmptyStateContent>
                <EmptyStateTitle>No stock changes yet</EmptyStateTitle>
                <EmptyStateDescription>
                  Record a restock, usage, or adjustment to start the ledger.
                </EmptyStateDescription>
              </EmptyStateContent>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kind</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Occurred</TableHead>
                    <TableHead>Recorded by</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => {
                    // Older rows predate `source` and only carry the note.
                    const isBulkAdjustment =
                      movement.source === "bulk" ||
                      (movement.source === undefined &&
                        (movement.note === "Opening stock" ||
                          movement.note === "Bulk stock adjustment"));
                    const isNegativeBulk =
                      isBulkAdjustment && movement.quantityInBase < 0;
                    const unitLabel =
                      product?.baseUnitAbbreviation ?? product?.baseUnitName;

                    return (
                      <TableRow key={movement._id}>
                        <TableCell>
                          {movementKindLabels[movement.kind]}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap",
                            isNegativeBulk && "text-destructive",
                          )}
                          title={
                            product?.baseUnitAbbreviation
                              ? product.baseUnitName
                              : undefined
                          }
                        >
                          {movement.quantityInBase > 0 ? "+" : ""}
                          {movement.quantityInBase} {unitLabel}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {new Date(movement.occurredAt).toLocaleString()}
                        </TableCell>
                        <TableCell>{movement.recordedBy}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {movement.linkedSaleId ? (
                            <SaleNoteButton
                              saleId={movement.linkedSaleId}
                              customerName={movement.saleCustomerName}
                              isVoid={movement.reversal === true}
                              onOpen={setSaleId}
                            />
                          ) : (
                            (movement.note ?? "—")
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </EmptyState>
          )}
        </div>
      </SheetContent>

      <SaleDetailSheet
        saleId={saleId}
        onOpenChange={(next) => {
          if (!next) setSaleId(null);
        }}
      />
    </Sheet>
  );
}
