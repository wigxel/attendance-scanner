"use client";

import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  SupplierForm,
  type SupplierFormValues,
  supplierFormDefaultState,
} from "@/components/forms/SupplierForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/components/inventory/_generated/dataModel";

type Supplier = Doc<"suppliers">;

type SupplierFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onCreated?: (supplierId: string) => void;
};

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
  onCreated,
}: SupplierFormDialogProps) {
  const createSupplier = useMutation(api.inventory.createSupplier);
  const updateSupplier = useMutation(api.inventory.updateSupplier);

  const initialFormData: SupplierFormValues | undefined = supplier
    ? {
        ...supplierFormDefaultState,
        name: supplier.name,
        phone: supplier.phone ?? "",
        contactName: supplier.contactName ?? "",
        notes: supplier.notes ?? "",
      }
    : undefined;

  const handleSubmit = async (values: SupplierFormValues) => {
    try {
      if (supplier) {
        await updateSupplier({ supplierId: supplier._id, ...values });
        toast.success("Supplier updated");
      } else {
        const supplierId = await createSupplier(values);
        toast.success("Supplier created");
        onCreated?.(supplierId);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not save supplier", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {supplier ? "Edit supplier" : "New supplier"}
          </DialogTitle>
          <DialogDescription>
            Who you buy stock from. A purchase can have no supplier.
          </DialogDescription>
        </DialogHeader>

        <SupplierForm
          key={supplier?._id ?? "new"}
          initialFormData={initialFormData}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
