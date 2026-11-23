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
import { UnitFormDialog } from "@/components/inventory/unit-form-dialog";
import { StdTable } from "@/components/std-table";
import { useTableFilters } from "@/components/std-table/filters";
import { Button } from "@/components/ui/button";
import { createConfirmAction } from "@/components/ui/confirm-action";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/components/inventory/_generated/dataModel";
import { track } from "@/lib/analytics";
import { statusFilterOptions } from "./product-columns";
import { createUnitColumns, type UnitRow } from "./unit-columns";

type Unit = Doc<"units">;

const ConfirmArchiveUnit = createConfirmAction<UnitRow>({
  title: (unit) => `Archive "${unit.name}"?`,
  description: "It stays in the list but can no longer be picked.",
  confirmLabel: "Archive",
});

export function UnitsContent() {
  const [search, setSearch] = useState("");
  const filters = useTableFilters({
    status: { options: statusFilterOptions, queryKey: "units_status" },
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<UnitRow | null>(null);

  const units = useQuery(api.inventory.listUnits, {
    includeArchived: true,
  });
  const archiveUnit = useMutation(api.inventory.archiveUnit);

  const openCreate = useCallback(() => {
    setEditing(null);
    setIsFormOpen(true);
  }, []);

  const openEdit = useCallback((unit: UnitRow) => {
    setEditing(unit);
    setIsFormOpen(true);
  }, []);

  const handleArchive = useCallback(
    async (unit: UnitRow) => {
      try {
        await archiveUnit({ unitId: unit._id });
        track("inventory_unit_archived", { unit_id: unit._id });
        toast.success("Unit archived");
      } catch (error) {
        toast.error("Could not archive unit", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [archiveUnit],
  );

  const columns = useMemo(
    () =>
      createUnitColumns({
        onEdit: openEdit,
        onArchive: (unit) => setArchiveTarget(unit),
      }),
    [openEdit],
  );

  if (units === undefined) {
    return <Skeleton className="h-[60svh] w-full" />;
  }

  // No filter picked means Active — the old toggle-off view.
  const showArchived = filters.status.value === "archived";
  const visibleUnits = units.filter((unit) =>
    showArchived ? !unit.active : unit.active,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Units</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            What you count products in. A unit used by an active product cannot
            be archived.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New unit
          </Button>
        </div>
      </div>

      <StdTable.Root
        columns={columns}
        data={visibleUnits}
        searchTerm={search}
        onSearchChange={setSearch}
        meta={filters}
        pageSize={10}
      >
        <StdTable.Card>
          <StdTable.Header>
            <StdTable.SearchInput placeholder="Search by name or abbreviation..." />
            <StdTable.ColumnSelector />
          </StdTable.Header>

          <StdTable.CardBody
            emptyState={
              <EmptyStateContent>
                <EmptyStateTitle>No units yet</EmptyStateTitle>
                <EmptyStateDescription>
                  Add a unit such as pack or carton before adding products.
                </EmptyStateDescription>
              </EmptyStateContent>
            }
          />

          <StdTable.Footer>
            <StdTable.Pagination />
          </StdTable.Footer>
        </StdTable.Card>
      </StdTable.Root>

      <UnitFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        unit={editing}
      />

      <ConfirmArchiveUnit
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
