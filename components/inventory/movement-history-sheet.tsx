"use client";

import { useQuery } from "convex/react";
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

type MovementHistorySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: { productId: string; name: string; baseUnitName: string } | null;
};

export function MovementHistorySheet({
  open,
  onOpenChange,
  product,
}: MovementHistorySheetProps) {
  const movements = useQuery(
    api.inventory.productMovements,
    product ? { productId: product.productId } : "skip",
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{product ? product.name : "Movements"}</SheetTitle>
          <SheetDescription>
            The last 20 movements, newest first. The ledger is the audit trail.
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
                <EmptyStateTitle>No movements yet</EmptyStateTitle>
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
                  {movements.map((movement) => (
                    <TableRow key={movement._id}>
                      <TableCell>{movementKindLabels[movement.kind]}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {movement.quantityInBase > 0 ? "+" : ""}
                        {movement.quantityInBase} {product?.baseUnitName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(movement.occurredAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{movement.recordedBy}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {movement.note ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </EmptyState>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
