"use client";

import { useMutation } from "convex/react";
import { toast } from "sonner";
import { UnitForm, type UnitFormValues } from "@/components/forms/UnitForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/components/inventory/_generated/dataModel";

type Unit = Doc<"units">;

type UnitFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit?: Unit | null;
};

export function UnitFormDialog({
  open,
  onOpenChange,
  unit,
}: UnitFormDialogProps) {
  const createUnit = useMutation(api.inventory.createUnit);
  const renameUnit = useMutation(api.inventory.renameUnit);

  const initialFormData: UnitFormValues | undefined = unit
    ? { name: unit.name, abbreviation: unit.abbreviation ?? "" }
    : undefined;

  const handleSubmit = async (values: UnitFormValues) => {
    try {
      if (unit) {
        await renameUnit({
          unitId: unit._id,
          name: values.name,
          abbreviation: values.abbreviation,
        });
        toast.success("Unit updated");
      } else {
        await createUnit({
          name: values.name,
          abbreviation: values.abbreviation,
        });
        toast.success("Unit created");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not save unit", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{unit ? "Edit unit" : "New unit"}</DialogTitle>
          <DialogDescription>
            Units are what you count products in, such as pack or carton.
          </DialogDescription>
        </DialogHeader>

        <UnitForm
          key={unit?._id ?? "new"}
          initialFormData={initialFormData}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
