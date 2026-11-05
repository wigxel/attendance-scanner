"use client";

import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  ProductForm,
  type ProductFormValues,
  productFormDefaultState,
} from "@/components/forms/ProductForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/components/inventory/_generated/dataModel";

type Product = Doc<"products">;

type ProductFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
};

function toNaira(kobo: number | undefined) {
  return kobo === undefined ? "" : String(kobo / 100);
}

function toKobo(values: ProductFormValues) {
  return {
    costPriceKobo: Math.round(values.costPriceNaira * 100),
    sellPriceKobo:
      values.sellPriceNaira === ""
        ? undefined
        : Math.round(Number(values.sellPriceNaira) * 100),
  };
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: ProductFormDialogProps) {
  const createProduct = useMutation(api.inventory.createProduct);
  const updateProduct = useMutation(api.inventory.updateProduct);

  const initialFormData: ProductFormValues | undefined = product
    ? {
        ...productFormDefaultState,
        name: product.name,
        sku: product.sku ?? "",
        baseUnitId: product.baseUnitId,
        reorderLevel: product.reorderLevel,
        costPriceNaira: product.costPriceKobo / 100,
        sellPriceNaira: toNaira(product.sellPriceKobo),
      }
    : undefined;

  const handleSubmit = async (values: ProductFormValues) => {
    const money = toKobo(values);

    try {
      if (product) {
        await updateProduct({
          productId: product._id,
          name: values.name,
          sku: values.sku,
          baseUnitId: values.baseUnitId,
          reorderLevel: values.reorderLevel,
          ...money,
        });
        toast.success("Product updated");
      } else {
        await createProduct({
          name: values.name,
          sku: values.sku,
          baseUnitId: values.baseUnitId,
          reorderLevel: values.reorderLevel,
          ...money,
        });
        toast.success("Product created");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not save product", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>
            A product is catalogue identity only. Stock is recorded later as
            movements.
          </DialogDescription>
        </DialogHeader>

        <ProductForm
          key={product?._id ?? "new"}
          initialFormData={initialFormData}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
