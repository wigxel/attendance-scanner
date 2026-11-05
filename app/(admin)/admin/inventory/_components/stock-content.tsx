"use client";

import { useQuery } from "convex/react";
import { ClipboardList } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { AppDataTable } from "@/components/DataTable";
import {
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import {
  MovementFormDialog,
  type MovementTarget,
} from "@/components/inventory/movement-form-dialog";
import { MovementHistorySheet } from "@/components/inventory/movement-history-sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { OpeningStockDialog } from "./opening-stock-dialog";
import { createStockColumns, type StockRow } from "./stock-columns";

export function StockContent() {
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [movementTarget, setMovementTarget] = useState<StockRow | null>(null);
  const [historyTarget, setHistoryTarget] = useState<StockRow | null>(null);
  const [isOpeningOpen, setIsOpeningOpen] = useState(false);

  const levels = useQuery(api.inventory.stockLevels, {});

  const openMovement = useCallback((row: StockRow) => {
    setMovementTarget(row);
  }, []);

  const openHistory = useCallback((row: StockRow) => {
    setHistoryTarget(row);
  }, []);

  const columns = useMemo(
    () =>
      createStockColumns({
        onRecordMovement: openMovement,
        onOpenHistory: openHistory,
      }),
    [openMovement, openHistory],
  );

  if (levels === undefined) {
    return <Skeleton className="h-[60svh] w-full" />;
  }

  const rows: StockRow[] = lowOnly
    ? levels.filter((level) => level.status !== "ok")
    : levels;

  const movementDialogTarget: MovementTarget | null = movementTarget
    ? {
        productId: movementTarget.productId,
        name: movementTarget.name,
        baseUnitName: movementTarget.baseUnitName,
        currentQuantity: movementTarget.quantity,
      }
    : null;

  const historyDialogTarget = historyTarget
    ? {
        productId: historyTarget.productId,
        name: historyTarget.name,
        baseUnitName: historyTarget.baseUnitName,
      }
    : null;

  const closeMovementDialog = (open: boolean) => {
    if (!open) setMovementTarget(null);
  };

  const closeHistoryDialog = (open: boolean) => {
    if (!open) setHistoryTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Stock</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quantity on hand comes from the movement ledger, never a stored
            column.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="low-only-stock"
              checked={lowOnly}
              onCheckedChange={setLowOnly}
            />
            <Label htmlFor="low-only-stock">Low and out only</Label>
          </div>
          <Button variant="outline" onClick={() => setIsOpeningOpen(true)}>
            <ClipboardList className="h-4 w-4" />
            Opening stock
          </Button>
        </div>
      </div>

      <AppDataTable
        columns={columns}
        data={rows}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or SKU..."
        emptyState={
          <EmptyStateContent>
            <EmptyStateTitle>
              {lowOnly ? "Nothing needs reordering" : "No products yet"}
            </EmptyStateTitle>
            <EmptyStateDescription>
              {lowOnly
                ? "Every product is above its reorder level."
                : "Add products to the catalogue, then record their opening stock."}
            </EmptyStateDescription>
          </EmptyStateContent>
        }
      />

      <MovementFormDialog
        open={movementTarget !== null}
        onOpenChange={closeMovementDialog}
        target={movementDialogTarget}
      />

      <MovementHistorySheet
        open={historyTarget !== null}
        onOpenChange={closeHistoryDialog}
        product={historyDialogTarget}
      />

      <OpeningStockDialog
        open={isOpeningOpen}
        onOpenChange={setIsOpeningOpen}
        products={levels}
      />
    </div>
  );
}
