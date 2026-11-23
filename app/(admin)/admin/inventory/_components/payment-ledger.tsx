"use client";

import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SalePaymentRow } from "@/convex/inventory";
import { formatKobo } from "@/lib/currency.helpers";
import { paymentChannelLabels } from "@/lib/payment-channel";

function formatPaymentDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
}

/** What the money came in on, or why the row is not money in. */
function tenderLabel(payment: SalePaymentRow) {
  if (payment.kind === "payment") {
    return payment.channel ? paymentChannelLabels[payment.channel] : "Cash";
  }
  return payment.kind === "writeOff" ? "Write-off" : "Reversal";
}

type PaymentLedgerProps = {
  payments: SalePaymentRow[];
  canManage: boolean;
  onReverse: (paymentId: string) => void;
};

/**
 * The money log of one sale, newest first. Shared home for any view that
 * shows a sale's history. The ledger is append-only, so a reversal is
 * just another row; the row it points at stops offering Reverse again.
 */
export function PaymentLedger({
  payments,
  canManage,
  onReverse,
}: PaymentLedgerProps) {
  const rows = [...payments].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  const reversedIds = new Set(
    payments.flatMap((payment) =>
      payment.reversesId ? [payment.reversesId] : [],
    ),
  );

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No money rows on this sale.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount (₦)</TableHead>
            <TableHead>Tender</TableHead>
            <TableHead>Who</TableHead>
            {canManage ? <TableHead /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((payment) => {
            const isReversal = payment.kind === "reversal";
            const isReversible = !isReversal && !reversedIds.has(payment._id);

            return (
              <TableRow key={payment._id}>
                <TableCell className="whitespace-nowrap">
                  {formatPaymentDate(payment.paidAt)}
                </TableCell>
                <TableCell
                  className={
                    isReversal
                      ? "text-right tabular-nums text-muted-foreground"
                      : "text-right tabular-nums"
                  }
                >
                  {isReversal ? "−" : ""}
                  {formatKobo(payment.amountKobo)}
                </TableCell>
                <TableCell>{tenderLabel(payment)}</TableCell>
                <TableCell className="max-w-28 truncate">
                  {payment.recordedByName}
                </TableCell>
                {canManage ? (
                  <TableCell className="text-right">
                    {isReversible ? (
                      <ConfirmAction
                        title="Reverse payment?"
                        description="It stays in the history and the balance goes back up."
                        confirmLabel="Reverse"
                        onConfirm={() => onReverse(payment._id)}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="Reverse payment"
                        >
                          <Undo2 className="size-3.5" />
                        </Button>
                      </ConfirmAction>
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
