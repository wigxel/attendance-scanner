"use client";

import { useMutation } from "convex/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { StockRow } from "./stock-columns";

type OpeningStockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: StockRow[];
};

export function OpeningStockDialog({
  open,
  onOpenChange,
  products,
}: OpeningStockDialogProps) {
  const recordOpeningStock = useMutation(api.inventory.recordOpeningStock);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const filled = useMemo(
    () =>
      products.flatMap((product) => {
        const raw = counts[product.productId]?.trim();
        if (!raw) return [];
        return [{ productId: product.productId, quantity: Number(raw) }];
      }),
    [products, counts],
  );

  const hasInvalid = filled.some(
    (row) => !Number.isFinite(row.quantity) || row.quantity < 0,
  );

  const handleSave = async () => {
    if (filled.length === 0) return;

    setIsSaving(true);
    try {
      const written = await recordOpeningStock({ rows: filled });
      toast.success(`Opening stock saved for ${written} products`);
      setCounts({});
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not save opening stock", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Opening stock</DialogTitle>
          <DialogDescription>
            Count what is on the shelf today. Each filled row records one
            adjustment; blank rows are skipped.
          </DialogDescription>
        </DialogHeader>

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a product to the catalogue first.
          </p>
        ) : (
          <div className="max-h-[55svh] space-y-2 overflow-y-auto pr-1">
            {products.map((product) => (
              <div
                key={product.productId}
                className="flex items-center justify-between gap-4 rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    On hand: {product.quantity} {product.baseUnitName}
                  </p>
                </div>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  aria-label={`Opening quantity for ${product.name}`}
                  className="w-28"
                  value={counts[product.productId] ?? ""}
                  onChange={(event) =>
                    setCounts((previous) => ({
                      ...previous,
                      [product.productId]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={filled.length === 0 || hasInvalid || isSaving}
          >
            {isSaving ? "Saving..." : "Save opening stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
