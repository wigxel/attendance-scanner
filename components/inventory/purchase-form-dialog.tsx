"use client";

import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  PurchaseForm,
  type PurchaseFormValues,
  toKobo,
} from "@/components/forms/PurchaseForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";

type PurchaseFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

export function PurchaseFormDialog({
  open,
  onOpenChange,
  onCreated,
}: PurchaseFormDialogProps) {
  const createPurchase = useMutation(api.inventory.createPurchase);

  const handleSubmit = async (values: PurchaseFormValues) => {
    try {
      await createPurchase({
        supplierId: values.supplierId || undefined,
        occurredAt: new Date(`${values.occurredAt}T00:00:00`).toISOString(),
        amountPaidKobo:
          values.amountPaidNaira === ""
            ? undefined
            : toKobo(values.amountPaidNaira),
        freightKobo:
          values.freightNaira === "" ? undefined : toKobo(values.freightNaira),
        discountKobo:
          values.discountNaira === ""
            ? undefined
            : toKobo(values.discountNaira),
        note: values.note?.trim() || undefined,
        lines: values.lines.map((line) => ({
          productId: line.productId,
          unitId: line.unitId,
          quantity: Number(line.quantity),
          unitCostKobo: toKobo(line.unitCostNaira),
        })),
      });
      toast.success("Purchase recorded");
      onCreated?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not record purchase", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Record purchase</DialogTitle>
          <DialogDescription>
            What you bought and at what cost. This restocks the products and
            moves their average cost.
          </DialogDescription>
        </DialogHeader>

        <PurchaseForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
