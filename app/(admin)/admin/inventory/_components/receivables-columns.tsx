"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Receivable } from "@/convex/inventory";
import { formatKoboPlain } from "@/lib/currency.helpers";
import { serialNo } from "@/lib/data.helpers";

export function receivableSearchText(receivable: Receivable) {
  return `${receivable.customerName ?? ""} ${receivable.customerId}`;
}

export const receivablesColumns: ColumnDef<Receivable>[] = [
  {
    id: "sn",
    header: "S/N",
    cell: ({ row }) => <span>{serialNo(row.index + 1)}</span>,
  },
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
    meta: { label: "Total owed" },
    accessorKey: "totalOwedKobo",
    cell: ({ row }) => (
      <span className="block whitespace-nowrap text-right tabular-nums">
        {formatKoboPlain(row.original.totalOwedKobo)}
      </span>
    ),
  },
  {
    id: "overdueKobo",
    header: () => <span className="block text-right">Overdue (₦)</span>,
    meta: { label: "Overdue" },
    accessorKey: "overdueKobo",
    cell: ({ row }) => {
      const { overdueKobo, daysOverdue } = row.original;
      if (overdueKobo === 0) {
        return (
          <span className="block text-right text-muted-foreground">—</span>
        );
      }
      return (
        <span className="block whitespace-nowrap text-right tabular-nums">
          {formatKoboPlain(overdueKobo)}
          {daysOverdue !== null ? (
            <span className="block text-xs font-normal text-destructive">
              {daysOverdue} {daysOverdue === 1 ? "day" : "days"} late
            </span>
          ) : null}
        </span>
      );
    },
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
