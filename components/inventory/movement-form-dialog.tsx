"use client";

import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  defaultMovementFormState,
  type MovementFormValues,
  StockMovementForm,
} from "@/components/forms/StockMovementForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";

export type MovementTarget = {
  productId: string;
  name: string;
  baseUnitName: string;
  currentQuantity?: number;
};

type MovementFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target?: MovementTarget | null;
};

export function MovementFormDialog({
  open,
  onOpenChange,
  target,
}: MovementFormDialogProps) {
  const recordMovement = useMutation(api.inventory.recordMovement);

  const handleSubmit = async (values: MovementFormValues) => {
    if (!target) return;

    try {
      await recordMovement({
        productId: target.productId,
        kind: values.kind,
        quantity: values.quantity,
        occurredAt: new Date(values.occurredAt).toISOString(),
        note: values.note.trim() || undefined,
      });
      toast.success("Stock movement recorded");
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not record movement", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record movement</DialogTitle>
          <DialogDescription>
            {target
              ? `${target.name} — counted in ${target.baseUnitName}.`
              : "Choose a product first."}
          </DialogDescription>
        </DialogHeader>

        {target && (
          <StockMovementForm
            key={target.productId}
            initialFormData={defaultMovementFormState()}
            baseUnitName={target.baseUnitName}
            currentQuantity={target.currentQuantity}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
