"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Receivable } from "@/convex/inventory";

const amountFormatter = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 2,
});

function formatAmount(kobo: number) {
  return amountFormatter.format(kobo / 100);
}

export function receivableSearchText(receivable: Receivable) {
  return `${receivable.customerName ?? ""} ${receivable.customerId}`;
}

export const receivablesColumns: ColumnDef<Receivable>[] = [
  {
    id: "customer",
    header: "Customer",
    // The raw profile id joins the search text so a deleted customer stays
    // findable by id.
    accessorFn: receivableSearchText,
    cell: ({ row }) => {
      const { customerName, customerId } = row.original;

      return customerName ? (
        <span>{customerName}</span>
      ) : (
        <span>
          Deleted customer
          <span className="block text-xs font-normal text-muted-foreground">
            {customerId}
          </span>
        </span>
      );
    },
  },
  {
    id: "totalOwedKobo",
    header: () => <span className="block text-right">Total owed (₦)</span>,
    accessorKey: "totalOwedKobo",
    cell: ({ row }) => (
      <span className="block whitespace-nowrap text-right tabular-nums">
        {formatAmount(row.original.totalOwedKobo)}
      </span>
    ),
  },
  {
    id: "oldestUnpaidAt",
    header: "Oldest unpaid",
    accessorKey: "oldestUnpaidAt",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {new Date(row.original.oldestUnpaidAt).toLocaleDateString("en-NG", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
    ),
  },
];
