"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { PurchaseSummary } from "@/convex/inventory";
import { currencyFormatter } from "@/lib/currency.helpers";

function formatKobo(value: number) {
  return currencyFormatter.format(value / 100);
}

export const purchaseColumns: ColumnDef<PurchaseSummary>[] = [
  {
    id: "occurredAt",
    header: "Date",
    accessorKey: "occurredAt",
    cell: ({ row }) =>
      new Date(row.original.occurredAt).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
  },
  {
    id: "supplierName",
    header: "Supplier",
    accessorKey: "supplierName",
    cell: ({ row }) => row.original.supplierName ?? "No supplier",
  },
  {
    id: "lineCount",
    header: "Lines",
    accessorKey: "lineCount",
  },
  {
    id: "totalKobo",
    header: "Total",
    accessorKey: "totalKobo",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {formatKobo(row.original.totalKobo)}
      </span>
    ),
  },
  {
    id: "outstandingKobo",
    header: "Outstanding",
    accessorKey: "outstandingKobo",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {row.original.voided ? "—" : formatKobo(row.original.outstandingKobo)}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "voided",
    cell: ({ row }) => (
      <Badge variant={row.original.voided ? "secondary" : "default"}>
        {row.original.voided ? "Voided" : "Posted"}
      </Badge>
    ),
  },
];
