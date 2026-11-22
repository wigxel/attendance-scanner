"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Archive, ArchiveRestore, Pencil, PlusCircle } from "lucide-react";
import { HeaderFilter } from "@/components/std-table/filters";
import { Badge } from "@/components/ui/badge";
import type { Doc } from "@/convex/components/inventory/_generated/dataModel";
import { RowActions } from "./row-actions";

export type ProductRow = Doc<"products"> & { baseUnitName: string };

export type CatalogueStatus = "active" | "archived";

export const statusFilterOptions: readonly {
  value: CatalogueStatus;
  label: string;
}[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

type ProductColumnParam = {
  onEdit: (product: ProductRow) => void;
  onArchive: (product: ProductRow) => void;
  onRestore: (product: ProductRow) => void;
  onRecordMovement: (product: ProductRow) => void;
};

export function createProductColumns(
  actions: ProductColumnParam,
): ColumnDef<ProductRow>[] {
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
      header: ({ table }) => (
        <HeaderFilter table={table} id="status" label="Status" />
      ),
      meta: { label: "Status" },
      accessorKey: "active",
      cell: ({ row }) => (
        <Badge variant={row.original.active ? "success" : "secondary"}>
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
          <RowActions
            rowLabel={product.name}
            actions={
              product.active
                ? [
                    {
                      icon: <PlusCircle />,
                      label: "Record change",
                      onSelect: () => actions.onRecordMovement(product),
                    },
                    {
                      icon: <Pencil />,
                      label: "Edit",
                      onSelect: () => actions.onEdit(product),
                    },
                    {
                      icon: <Archive />,
                      label: "Archive",
                      onSelect: () => actions.onArchive(product),
                    },
                  ]
                : [
                    {
                      icon: <Pencil />,
                      label: "Edit",
                      onSelect: () => actions.onEdit(product),
                    },
                    {
                      icon: <ArchiveRestore />,
                      label: "Restore",
                      onSelect: () => actions.onRestore(product),
                    },
                  ]
            }
          />
        );
      },
    },
  ];
}
