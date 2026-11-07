"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { SaleSummary } from "@/convex/inventory";
import { currencyFormatter } from "@/lib/currency.helpers";

function formatKobo(value: number) {
  return currencyFormatter.format(value / 100);
}

const channelLabels = {
  cash: "Cash",
  pos: "POS",
  transfer: "Transfer",
} as const;

export const saleColumns: ColumnDef<SaleSummary>[] = [
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
    id: "customer",
    header: "Customer",
    accessorFn: (sale) => sale.customerName ?? "Walk-in",
    cell: ({ row }) => row.original.customerName ?? "Walk-in",
  },
  {
    id: "items",
    header: "Items",
    // Product names and the note are search text, not a stored column.
    accessorFn: (sale) =>
      `${sale.productNames.join(", ")} ${sale.note ?? ""}`.trim(),
    cell: ({ row }) => (
      <span className="block max-w-64 truncate">
        {row.original.lineCount} item
        {row.original.lineCount === 1 ? "" : "s"}
        {row.original.productNames.length > 0
          ? ` · ${row.original.productNames.join(", ")}`
          : ""}
      </span>
    ),
  },
  {
    id: "channel",
    header: "Channel",
    accessorKey: "channel",
    cell: ({ row }) => channelLabels[row.original.channel],
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
    id: "status",
    header: "Status",
    accessorKey: "voided",
    cell: ({ row }) => (
      <Badge variant={row.original.voided ? "secondary" : "default"}>
        {row.original.voided ? "Voided" : "Completed"}
      </Badge>
    ),
  },
];
