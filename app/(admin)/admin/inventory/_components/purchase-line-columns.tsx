"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { PurchaseLine } from "@/convex/inventory";
import { currencyFormatter } from "@/lib/currency.helpers";

function formatKobo(value: number) {
  return currencyFormatter.format(value / 100);
}

export const purchaseLineColumns: ColumnDef<PurchaseLine>[] = [
  {
    id: "productName",
    header: "Product",
    accessorKey: "productName",
  },
  {
    id: "quantity",
    header: "Quantity",
    accessorKey: "quantity",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {row.original.quantity} {row.original.unitName}
      </span>
    ),
  },
  {
    id: "quantityInBase",
    header: "In base units",
    accessorKey: "quantityInBase",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {Number(row.original.quantityInBase.toFixed(2))}
      </span>
    ),
  },
  {
    id: "unitCostKobo",
    header: "Cost per unit",
    accessorKey: "unitCostKobo",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {formatKobo(row.original.unitCostKobo)}
      </span>
    ),
  },
  {
    id: "lineTotalKobo",
    header: "Line total",
    accessorKey: "lineTotalKobo",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {formatKobo(row.original.lineTotalKobo)}
      </span>
    ),
  },
];
