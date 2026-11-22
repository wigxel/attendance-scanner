"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Archive, Pencil } from "lucide-react";
import { HeaderFilter } from "@/components/std-table/filters";
import { Badge } from "@/components/ui/badge";
import type { Doc } from "@/convex/components/inventory/_generated/dataModel";
import { RowActions } from "./row-actions";

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
      header: ({ table }) => (
        <HeaderFilter table={table} id="status" label="Status" />
      ),
      meta: { label: "Status" },
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
          <RowActions
            rowLabel={unit.name}
            actions={[
              {
                icon: <Pencil />,
                label: "Edit",
                onSelect: () => actions.onEdit(unit),
              },
              ...(unit.active
                ? [
                    {
                      icon: <Archive />,
                      label: "Archive",
                      onSelect: () => actions.onArchive(unit),
                    },
                  ]
                : []),
            ]}
          />
        );
      },
    },
  ];
}
