"use client";

import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppDataTable } from "@/components/DataTable";
import {
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import { ProductFormDialog } from "@/components/inventory/product-form-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/components/inventory/_generated/dataModel";
import { createProductColumns, type ProductRow } from "./product-columns";

type Product = Doc<"products">;

export function ProductsContent() {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const products = useQuery(api.inventory.listProducts, {
    includeArchived: showArchived,
  });
  const units = useQuery(api.inventory.listUnits, { includeArchived: true });
  const archiveProduct = useMutation(api.inventory.archiveProduct);

  const openCreate = useCallback(() => {
    setEditing(null);
    setIsFormOpen(true);
  }, []);

  const openEdit = useCallback((product: ProductRow) => {
    setEditing(product);
    setIsFormOpen(true);
  }, []);

  const handleArchive = useCallback(
    async (product: ProductRow) => {
      const ok = window.confirm(
        `Archive "${product.name}"? It stays in the catalogue but is hidden from picking.`,
      );
      if (!ok) return;

      try {
        await archiveProduct({ productId: product._id });
        toast.success("Product archived");
      } catch (error) {
        toast.error("Could not archive product", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [archiveProduct],
  );

  // Movements are the next step's job; the row action exists now so the
  // catalogue is complete without a later layout change.
  const columns = useMemo(
    () => createProductColumns({ onEdit: openEdit, onArchive: handleArchive }),
    [openEdit, handleArchive],
  );

  if (products === undefined || units === undefined) {
    return <Skeleton className="h-[60svh] w-full" />;
  }

  const unitNames = new Map(units.map((unit) => [unit._id, unit.name]));
  const rows: ProductRow[] = products.map((product) => ({
    ...product,
    baseUnitName: unitNames.get(product.baseUnitId) ?? "Unknown unit",
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Catalogue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Products you stock. Quantities come from movements, not this list.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-archived-products"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived-products">Show archived</Label>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New product
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
            <EmptyStateTitle>No products yet</EmptyStateTitle>
            <EmptyStateDescription>
              Add a product to start picking it on movements later.
            </EmptyStateDescription>
          </EmptyStateContent>
        }
      />

      <ProductFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={editing}
      />
    </div>
  );
}
