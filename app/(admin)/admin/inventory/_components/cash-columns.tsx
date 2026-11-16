"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CashWithdrawalRow } from "@/convex/inventory";

function formatAmount(kobo: number) {
  return new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2 }).format(
    kobo / 100,
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function cashColumns(
  onReverse: (withdrawalId: string) => void,
): ColumnDef<CashWithdrawalRow>[] {
  return [
    {
      id: "withdrawnAt",
      header: "Date",
      accessorKey: "withdrawnAt",
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {formatDate(row.original.withdrawnAt)}
        </span>
      ),
    },
    {
      id: "note",
      header: "Note",
      accessorFn: (row) => row.note ?? "",
      cell: ({ row }) => row.original.note ?? "—",
    },
    {
      id: "recordedBy",
      header: "Who",
      accessorKey: "recordedByName",
      cell: ({ row }) => (
        <span className="max-w-28 truncate">{row.original.recordedByName}</span>
      ),
    },
    {
      id: "amountKobo",
      header: () => <span className="block text-right">Amount (₦)</span>,
      accessorKey: "amountKobo",
      cell: ({ row }) => {
        const isReversal = row.original.kind === "reversal";
        return (
          <span
            className={`block whitespace-nowrap text-right tabular-nums ${
              isReversal ? "text-muted-foreground" : undefined
            }`}
          >
            {isReversal ? "−" : ""}
            {formatAmount(row.original.amountKobo)}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.kind === "withdrawal" && !row.original.reversed ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Reverse withdrawal"
            onClick={() => onReverse(row.original._id)}
          >
            <Undo2 className="size-3.5" />
          </Button>
        ) : null,
    },
  ];
}
