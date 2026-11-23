"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMutation } from "convex/react";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { api } from "@/convex/_generated/api";
import type { CashWithdrawalRow } from "@/convex/inventory";
import { formatKoboPlain } from "@/lib/currency.helpers";

type RevertWithdrawalCellProps = {
  withdrawalId: string;
  children: React.ReactNode;
};

/** One row's undo: opens its own confirm, runs the reversal, toasts the result. */
function RevertWithdrawalCell({
  withdrawalId,
  children,
}: RevertWithdrawalCellProps) {
  const reverseWithdrawal = useMutation(api.inventory.reverseCashWithdrawal);

  const handleReverse = async () => {
    try {
      await reverseWithdrawal({ withdrawalId });
      toast.success("Withdrawal reversed");
    } catch (error) {
      toast.error("Could not reverse withdrawal", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <ConfirmAction
      title="Reverse withdrawal?"
      description="This action will mark the withdrawal as reversed in the transaction history. The withdrawn amount will be added back to the inventory cash in-hand balance."
      confirmLabel="Reverse"
      onConfirm={handleReverse}
    >
      {children}
    </ConfirmAction>
  );
}

/** "16 Nov 2026, 3:35 PM" — only the AM/PM marker is uppercased. */
function formatDateTime(iso: string) {
  const parts = new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(iso));

  return parts
    .map((part) =>
      part.type === "dayPeriod" ? part.value.toUpperCase() : part.value,
    )
    .join("");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function cashColumns(): ColumnDef<CashWithdrawalRow>[] {
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
      id: "createdAt",
      header: "Recorded",
      accessorKey: "createdAt",
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {formatDateTime(row.original.createdAt)}
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
      meta: { label: "Amount" },
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
            {formatKoboPlain(row.original.amountKobo)}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      meta: { label: "Status" },
      cell: ({ row }) => {
        if (row.original.kind === "reversal") {
          return <Badge variant="info">Reversal</Badge>;
        }
        if (row.original.reversed) {
          return <Badge variant="secondary">Reversed</Badge>;
        }
        return (
          <RevertWithdrawalCell withdrawalId={row.original._id}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Reverse withdrawal"
            >
              <Undo2 className="size-3.5" />
            </Button>
          </RevertWithdrawalCell>
        );
      },
    },
  ];
}
