"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Archive, Pencil } from "lucide-react";
import { AppTableActions } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/components/inventory/_generated/dataModel";

export type SupplierRow = Doc<"suppliers">;

export function createSupplierColumns(actions: {
  onEdit: (supplier: SupplierRow) => void;
  onArchive: (supplier: SupplierRow) => void;
}): ColumnDef<SupplierRow>[] {
  return [
    {
      id: "name",
      header: "Supplier",
      accessorKey: "name",
    },
    {
      id: "contactName",
      header: "Contact",
      accessorKey: "contactName",
      cell: ({ row }) => row.original.contactName ?? "—",
    },
    {
      id: "phone",
      header: "Phone",
      accessorKey: "phone",
      cell: ({ row }) => row.original.phone ?? "—",
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
        const supplier = row.original;
        return (
          <AppTableActions>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit ${supplier.name}`}
              onClick={() => actions.onEdit(supplier)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {supplier.active && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Archive ${supplier.name}`}
                onClick={() => actions.onArchive(supplier)}
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
