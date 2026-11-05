"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Archive, Pencil, PlusCircle } from "lucide-react";
import { AppTableActions } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/components/inventory/_generated/dataModel";

export type ProductRow = Doc<"products"> & { baseUnitName: string };

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function createProductColumns(actions: {
  onEdit: (product: ProductRow) => void;
  onArchive: (product: ProductRow) => void;
  onRecordMovement: (product: ProductRow) => void;
}): ColumnDef<ProductRow>[] {
  return [
    {
      id: "name",
      header: "Product",
      accessorKey: "name",
    },
    {
      id: "sku",
      header: "SKU",
      accessorKey: "sku",
      cell: ({ row }) => row.original.sku ?? "—",
    },
    {
      id: "base unit",
      header: "Base unit",
      accessorKey: "baseUnitName",
    },
    {
      id: "reorder level",
      header: "Reorder level",
      accessorKey: "reorderLevel",
    },
    {
      id: "cost price",
      header: "Cost price",
      accessorKey: "costPriceKobo",
      cell: ({ row }) => naira.format(row.original.costPriceKobo / 100),
    },
    {
      id: "sell price",
      header: "Sell price",
      accessorKey: "sellPriceKobo",
      cell: ({ row }) =>
        row.original.sellPriceKobo === undefined
          ? "—"
          : naira.format(row.original.sellPriceKobo / 100),
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
        const product = row.original;
        return (
          <AppTableActions>
            {product.active && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => actions.onRecordMovement(product)}
              >
                <PlusCircle className="h-4 w-4" />
                Record movement
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit ${product.name}`}
              onClick={() => actions.onEdit(product)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {product.active && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Archive ${product.name}`}
                onClick={() => actions.onArchive(product)}
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
