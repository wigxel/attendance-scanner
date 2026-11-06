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
import { SupplierFormDialog } from "@/components/inventory/supplier-form-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { createSupplierColumns, type SupplierRow } from "./supplier-columns";

export function SuppliersContent() {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRow | null>(null);

  const suppliers = useQuery(api.inventory.listSuppliers, {
    includeArchived: showArchived,
  });
  const archiveSupplier = useMutation(api.inventory.archiveSupplier);

  const openCreate = useCallback(() => {
    setEditing(null);
    setIsFormOpen(true);
  }, []);

  const openEdit = useCallback((supplier: SupplierRow) => {
    setEditing(supplier);
    setIsFormOpen(true);
  }, []);

  const handleArchive = useCallback(
    async (supplier: SupplierRow) => {
      const ok = window.confirm(`Archive "${supplier.name}"?`);
      if (!ok) return;

      try {
        await archiveSupplier({ supplierId: supplier._id });
        toast.success("Supplier archived");
      } catch (error) {
        toast.error("Could not archive supplier", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [archiveSupplier],
  );

  const columns = useMemo(
    () => createSupplierColumns({ onEdit: openEdit, onArchive: handleArchive }),
    [openEdit, handleArchive],
  );

  if (suppliers === undefined) {
    return <Skeleton className="h-[60svh] w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Suppliers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Who you buy stock from. A purchase can be recorded without one.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-archived-suppliers"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived-suppliers">Show archived</Label>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New supplier
          </Button>
        </div>
      </div>

      <AppDataTable
        columns={columns}
        data={suppliers}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or phone..."
        emptyState={
          <EmptyStateContent>
            <EmptyStateTitle>No suppliers yet</EmptyStateTitle>
            <EmptyStateDescription>
              Add the people or shops you buy stock from.
            </EmptyStateDescription>
          </EmptyStateContent>
        }
      />

      <SupplierFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        supplier={editing}
      />
    </div>
  );
}
