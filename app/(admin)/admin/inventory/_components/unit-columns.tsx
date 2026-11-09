"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Archive, Pencil } from "lucide-react";
import { AppTableActions } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/components/inventory/_generated/dataModel";

export type UnitRow = Doc<"units">;

export function createUnitColumns(actions: {
  onEdit: (unit: UnitRow) => void;
  onArchive: (unit: UnitRow) => void;
}): ColumnDef<UnitRow>[] {
  return [
    {
      id: "name",
      header: "Unit",
      accessorKey: "name",
    },
    {
      id: "abbreviation",
      header: "Abbreviation",
      accessorKey: "abbreviation",
      cell: ({ row }) => row.original.abbreviation ?? "—",
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "active",
      cell: ({ row }) => (
        <Badge variant={row.original.active ? "default" : "secondary"}>
          {row.original.active ? "Active" : "Archived"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const unit = row.original;
        return (
          <AppTableActions>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit ${unit.name}`}
              onClick={() => actions.onEdit(unit)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {unit.active && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Archive ${unit.name}`}
                onClick={() => actions.onArchive(unit)}
              >
                <Archive className="h-4 w-4" />
              </Button>
            )}
          </AppTableActions>
        );
      },
    },
  ];
}
