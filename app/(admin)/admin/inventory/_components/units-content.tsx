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
import { UnitFormDialog } from "@/components/inventory/unit-form-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/components/inventory/_generated/dataModel";
import { createUnitColumns, type UnitRow } from "./unit-columns";

type Unit = Doc<"units">;

export function UnitsContent() {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);

  const units = useQuery(api.inventory.listUnits, {
    includeArchived: showArchived,
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
      const ok = window.confirm(`Archive "${unit.name}"?`);
      if (!ok) return;

      try {
        await archiveUnit({ unitId: unit._id });
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
    () => createUnitColumns({ onEdit: openEdit, onArchive: handleArchive }),
    [openEdit, handleArchive],
  );

  if (units === undefined) {
    return <Skeleton className="h-[60svh] w-full" />;
  }

  return (
    <div className="space-y-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Units</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            What you count products in. A unit used by an active product cannot
            be archived.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-archived-units"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived-units">Show archived</Label>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New unit
          </Button>
        </div>
      </div>

      <AppDataTable
        columns={columns}
        data={units}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or abbreviation..."
        emptyState={
          <EmptyStateContent>
            <EmptyStateTitle>No units yet</EmptyStateTitle>
            <EmptyStateDescription>
              Add a unit such as pack or carton before adding products.
            </EmptyStateDescription>
          </EmptyStateContent>
        }
      />

      <UnitFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        unit={editing}
      />
    </div>
  );
}
