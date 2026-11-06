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
import { Label } from "@/components/ui/label";
import { StepperInput } from "@/components/ui/stepper-input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { StockRow } from "./stock-columns";

type BulkAdjustmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: StockRow[];
};

export function BulkAdjustmentDialog({
  open,
  onOpenChange,
  products,
}: BulkAdjustmentDialogProps) {
  const recordBulkAdjustment = useMutation(api.inventory.recordBulkAdjustment);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
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

  const currentQuantities = useMemo(
    () =>
      new Map(products.map((product) => [product.productId, product.quantity])),
    [products],
  );

  // A row whose count matches what is already in stock would write a zero
  // adjustment, so it is treated as unchanged.
  const changed = filled.filter(
    (row) => row.quantity !== currentQuantities.get(row.productId),
  );

  const hasInvalid = filled.some(
    (row) => !Number.isFinite(row.quantity) || row.quantity < 0,
  );

  const saveLabel = isSaving
    ? "Saving..."
    : filled.length > 0 && changed.length === 0
      ? "Nothing has changed"
      : "Save bulk adjustment";

  const handleSave = async () => {
    if (changed.length === 0) return;

    setIsSaving(true);
    try {
      const written = await recordBulkAdjustment({
        rows: changed,
        note: note.trim() || undefined,
      });
      toast.success(`Bulk adjustment saved for ${written} products`);
      setCounts({});
      setNote("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not save bulk adjustment", {
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
          <DialogTitle>Bulk stock adjustment</DialogTitle>
          <DialogDescription>
            Set the counted quantity for several products at once. Only rows
            that differ from the current count are saved.
          </DialogDescription>
        </DialogHeader>

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a product to the catalogue first.
          </p>
        ) : (
          <div className="max-h-[55svh] space-y-2 overflow-y-auto pr-1">
            {products.map((product) => {
              const raw = counts[product.productId]?.trim();
              const next = raw ? Number(raw) : null;
              const hasDelta =
                next !== null &&
                Number.isFinite(next) &&
                next !== product.quantity;

              return (
                <div
                  key={product.productId}
                  className="flex items-center justify-between gap-4 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      In stock: {product.quantity} {product.baseUnitName}
                      {hasDelta ? (
                        <span className="text-foreground">
                          {" "}
                          → {next} {product.baseUnitName}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="w-44 shrink-0">
                    <StepperInput
                      aria-label={`Counted quantity for ${product.name}`}
                      className="w-full text-right"
                      value={counts[product.productId] ?? ""}
                      onChange={(value) =>
                        setCounts((previous) => ({
                          ...previous,
                          [product.productId]: value,
                        }))
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="bulk-adjustment-note">Note (optional)</Label>
          <Textarea
            id="bulk-adjustment-note"
            placeholder="e.g. Month-end count"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Applies to every row in this adjustment.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={changed.length === 0 || hasInvalid || isSaving}
          >
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
