"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { CustomerCombobox } from "@/components/forms/CustomerCombobox";
import {
  paymentChannelLabels,
  RecordPaymentDialog,
} from "@/components/inventory/record-payment-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { SalePaymentRow } from "@/convex/inventory";
import { usePrivilege } from "@/hooks/usePrivilege";
import { currencyFormatter } from "@/lib/currency.helpers";
import { SaleStatusBadge } from "./sale-columns";

const channelLabels = {
  cash: "Cash",
  pos: "POS",
  transfer: "Transfer",
  credit: "Credit",
} as const;

function formatKobo(value: number) {
  return currencyFormatter.format(value / 100);
}

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
  /** Newest first. */
  payments: SalePaymentRow[];
  reversedIds: ReadonlySet<string>;
  canManage: boolean;
  onReverse: (paymentId: string) => void;
};

function PaymentLedger({
  payments,
  reversedIds,
  canManage,
  onReverse,
}: PaymentLedgerProps) {
  if (payments.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
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
          {payments.map((payment) => {
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onReverse(payment._id)}
                      >
                        Reverse
                      </Button>
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

type SaleDetailSheetProps = {
  saleId: string | null;
  onOpenChange: (open: boolean) => void;
};

export function SaleDetailSheet({
  saleId,
  onOpenChange,
}: SaleDetailSheetProps) {
  const detail = useQuery(
    api.inventory.saleDetail,
    saleId ? { saleId } : "skip",
  );
  const voidSale = useMutation(api.inventory.voidSale);
  const setSaleCustomer = useMutation(api.inventory.setSaleCustomer);
  const reverseSalePayment = useMutation(api.inventory.reverseSalePayment);
  const writeOffSale = useMutation(api.inventory.writeOffSale);
  const { valid: canManage } = usePrivilege("inventory:manage");

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const handleSheetOpenChange = (open: boolean) => {
    if (!open) setPaymentDialogOpen(false);
    onOpenChange(open);
  };

  const handleVoid = async () => {
    if (!saleId) return;
    const ok = window.confirm(
      "Void this sale? The stock goes back and the money leaves revenue.",
    );
    if (!ok) return;

    try {
      await voidSale({ saleId });
      toast.success("Sale voided");
    } catch (error) {
      toast.error("Could not void sale", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleReverse = async (paymentId: string) => {
    const ok = window.confirm(
      "Reverse this row? It stays in the history and the balance goes back up.",
    );
    if (!ok) return;

    try {
      await reverseSalePayment({ paymentId });
      toast.success("Payment reversed");
    } catch (error) {
      toast.error("Could not reverse payment", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleWriteOff = async (outstandingKobo: number) => {
    if (!saleId) return;
    const ok = window.confirm(
      `Write off ${formatKobo(outstandingKobo)}? That money stops counting as owed.`,
    );
    if (!ok) return;

    try {
      await writeOffSale({ saleId, amountKobo: outstandingKobo });
      toast.success("Balance written off");
    } catch (error) {
      toast.error("Could not write off balance", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const openCustomerDialog = () => {
    setCustomerId(detail?.sale.customerId ?? "");
    setCustomerDialogOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!saleId) return;

    try {
      await setSaleCustomer({ saleId, customerId: customerId || undefined });
      setCustomerDialogOpen(false);
      toast.success("Customer updated");
    } catch (error) {
      toast.error("Could not change customer", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // The ledger is append-only, so a reversal is just another row. Mark the
  // rows it points at so they stop offering Reverse again.
  const payments = detail
    ? [...detail.payments].sort((a, b) => b.paidAt.localeCompare(a.paidAt))
    : [];
  const reversedIds = new Set(
    payments.flatMap((payment) =>
      payment.reversesId ? [payment.reversesId] : [],
    ),
  );
  const canTakePayment = Boolean(
    detail && detail.outstandingKobo > 0 && detail.status !== "voided",
  );

  return (
    <>
      <Sheet open={saleId !== null} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {detail === undefined ? (
            <Skeleton className="mt-8 h-[50svh] w-full" />
          ) : detail === null ? (
            <SheetHeader>
              <SheetTitle>Sale not found</SheetTitle>
              <SheetDescription>
                It may have been removed from the list.
              </SheetDescription>
            </SheetHeader>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>
                  {formatKobo(detail.sale.totalKobo)} ·{" "}
                  {channelLabels[detail.sale.channel]}
                </SheetTitle>
                <SheetDescription>
                  {new Date(detail.sale.occurredAt).toLocaleString("en-NG")} ·
                  recorded by {detail.createdByName}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-4 pb-8">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="text-sm text-foreground">
                      {detail.customerName ?? "Walk-in"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SaleStatusBadge status={detail.status} />
                    {canManage ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={openCustomerDialog}
                      >
                        Change customer
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 rounded-md border px-3 py-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-sm tabular-nums">
                      {formatKobo(detail.sale.totalKobo)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="text-sm tabular-nums">
                      {formatKobo(detail.paidKobo)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Balance due</p>
                    <p className="text-sm tabular-nums">
                      {formatKobo(detail.outstandingKobo)}
                    </p>
                  </div>
                </div>

                {detail.sale.dueDate ? (
                  <p className="-mt-3 text-xs text-muted-foreground">
                    Due{" "}
                    {new Date(detail.sale.dueDate).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                ) : null}

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead className="text-right">Total (₦)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.lines.map((line) => (
                        <TableRow key={line._id}>
                          <TableCell>{line.productName}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {line.quantity} {line.unitName}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatKobo(line.lineTotalKobo)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Payments</p>
                    {canTakePayment ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setPaymentDialogOpen(true)}
                      >
                        Record payment
                      </Button>
                    ) : null}
                  </div>

                  <PaymentLedger
                    payments={payments}
                    reversedIds={reversedIds}
                    canManage={canManage ?? false}
                    onReverse={handleReverse}
                  />
                </div>

                {detail.sale.note ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Note</p>
                    <p className="text-sm text-foreground">
                      {detail.sale.note}
                    </p>
                  </div>
                ) : null}

                {canManage && !detail.sale.voided ? (
                  <div className="flex flex-wrap gap-2">
                    {detail.outstandingKobo > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleWriteOff(detail.outstandingKobo)}
                      >
                        Write off balance
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleVoid}
                    >
                      Void sale
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {paymentDialogOpen && detail ? (
        <RecordPaymentDialog
          open
          onOpenChange={setPaymentDialogOpen}
          saleId={detail.sale._id}
          outstandingKobo={detail.outstandingKobo}
        />
      ) : null}

      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change customer</DialogTitle>
            <DialogDescription>
              Leave the field blank for a walk-in. The total and stock stay as
              they are.
            </DialogDescription>
          </DialogHeader>

          <CustomerCombobox value={customerId} onChange={setCustomerId} />

          {customerId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-self-start"
              onClick={() => setCustomerId("")}
            >
              Clear customer
            </Button>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomerDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveCustomer}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
