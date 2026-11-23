"use client";

import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import { SupplierFormDialog } from "@/components/inventory/supplier-form-dialog";
import { StdTable } from "@/components/std-table";
import { useTableFilters } from "@/components/std-table/filters";
import { Button } from "@/components/ui/button";
import { createConfirmAction } from "@/components/ui/confirm-action";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { track } from "@/lib/inventory.track";
import { statusFilterOptions } from "./product-columns";
import { createSupplierColumns, type SupplierRow } from "./supplier-columns";

const ConfirmArchiveSupplier = createConfirmAction<SupplierRow>({
  title: (supplier) => `Archive "${supplier.name}"?`,
  description:
    "It stays in the list but can no longer be picked for purchases.",
  confirmLabel: "Archive",
});

export function SuppliersContent() {
  const [search, setSearch] = useState("");
  const filters = useTableFilters({
    status: { options: statusFilterOptions, queryKey: "suppliers_status" },
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<SupplierRow | null>(null);

  const suppliers = useQuery(api.inventory.listSuppliers, {
    includeArchived: true,
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
      try {
        await archiveSupplier({ supplierId: supplier._id });
        track("inventory_supplier_archived", { supplier_id: supplier._id });
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
    () =>
      createSupplierColumns({
        onEdit: openEdit,
        onArchive: (supplier) => setArchiveTarget(supplier),
      }),
    [openEdit],
  );

  if (suppliers === undefined) {
    return <Skeleton className="h-[60svh] w-full" />;
  }

  // No filter picked means Active — the old toggle-off view.
  const showArchived = filters.status.value === "archived";
  const visibleSuppliers = suppliers.filter((supplier) =>
    showArchived ? !supplier.active : supplier.active,
  );

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
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New supplier
          </Button>
        </div>
      </div>

      <StdTable.Root
        columns={columns}
        data={visibleSuppliers}
        searchTerm={search}
        onSearchChange={setSearch}
        meta={filters}
        pageSize={10}
      >
        <StdTable.Card>
          <StdTable.Header>
            <StdTable.SearchInput placeholder="Search by name or phone..." />
            <StdTable.ColumnSelector />
          </StdTable.Header>

          <StdTable.CardBody
            emptyState={
              <EmptyStateContent>
                <EmptyStateTitle>No suppliers yet</EmptyStateTitle>
                <EmptyStateDescription>
                  Add the people or shops you buy stock from.
                </EmptyStateDescription>
              </EmptyStateContent>
            }
          />

          <StdTable.Footer>
            <StdTable.Pagination />
          </StdTable.Footer>
        </StdTable.Card>
      </StdTable.Root>

      <SupplierFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        supplier={editing}
      />

      <ConfirmArchiveSupplier
        item={archiveTarget}
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        onConfirm={handleArchive}
      />
    </div>
  );
}
