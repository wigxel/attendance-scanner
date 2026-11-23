"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { CustomerCombobox } from "@/components/forms/CustomerCombobox";
import { PaymentHistorySection } from "@/components/inventory/payment-history-section";
import { RecordPaymentDialog } from "@/components/inventory/record-payment-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { DataList } from "@/components/ui/data-list";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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
import { usePrivilege } from "@/hooks/usePrivilege";
import { formatKobo } from "@/lib/currency.helpers";
import { track, useTrackOpen } from "@/lib/inventory.track";
import { SaleStatusBadge } from "./sale-columns";

const channelLabels = {
  cash: "Cash",
  pos: "POS",
  transfer: "Transfer",
  credit: "Credit",
  free: "Free",
} as const;

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
  const { valid: canSell } = usePrivilege("inventory:sell");
  // Till users may correct a fresh sale (void, customer); managers can do
  // everything, including reverse payments and write off.
  const canAdjust = canManage || canSell;

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  useTrackOpen("inventory_sale_detail_viewed", saleId !== null, {
    sale_id: saleId ?? undefined,
  });

  const handleSheetOpenChange = (open: boolean) => {
    if (!open) setPaymentDialogOpen(false);
    onOpenChange(open);
  };

  // The ledger is append-only, so a reversal is just another row. The shared
  // PaymentLedger sorts newest first and marks already-reversed rows.
  const canTakePayment = Boolean(
    detail && detail.outstandingKobo > 0 && detail.status !== "voided",
  );

  const handleVoid = async () => {
    if (!saleId) return;
    try {
      await voidSale({ saleId });
      track("inventory_sale_voided", { sale_id: saleId });
      toast.success("Sale voided");
    } catch (error) {
      toast.error("Could not void sale", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleReverse = async (paymentId: string) => {
    try {
      await reverseSalePayment({ paymentId });
      track("inventory_sale_payment_reversed", {
        sale_id: saleId,
        payment_id: paymentId,
      });
      toast.success("Payment reversed");
    } catch (error) {
      toast.error("Could not reverse payment", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleWriteOff = async (outstandingKobo: number) => {
    if (!saleId) return;
    try {
      await writeOffSale({ saleId, amountKobo: outstandingKobo });
      track("inventory_sale_written_off", {
        sale_id: saleId,
        amount_kobo: outstandingKobo,
      });
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
      track("inventory_sale_customer_set", {
        sale_id: saleId,
        customer_id: customerId || undefined,
      });
      setCustomerDialogOpen(false);
      toast.success("Customer updated");
    } catch (error) {
      toast.error("Could not change customer", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

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
                <SheetTitle>Sale details</SheetTitle>
                <SheetDescription className="max-w-[40ch]">
                  Everything recorded about this sale, with its items and
                  payment history.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-4 pb-8">
                <DataList>
                  <DataList.Item label="Status">
                    <SaleStatusBadge status={detail.status} />
                  </DataList.Item>

                  <DataList.Item label="Customer">
                    {detail.customerName ?? "Walk-in"}
                  </DataList.Item>

                  <DataList.Item label="Channel">
                    {channelLabels[detail.sale.channel]}
                  </DataList.Item>

                  <DataList.Item label="Date" className="whitespace-nowrap">
                    {new Date(detail.sale.occurredAt).toLocaleString("en-NG")}
                  </DataList.Item>

                  <DataList.Item label="Recorded by">
                    {detail.createdByName}
                  </DataList.Item>

                  <DataList.Item label="Due date">
                    {detail.sale.dueDate
                      ? new Date(detail.sale.dueDate).toLocaleDateString(
                          "en-NG",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : "—"}
                  </DataList.Item>

                  <DataList.Item label="Total" className="tabular-nums">
                    {formatKobo(detail.sale.totalKobo)}
                  </DataList.Item>

                  <DataList.Item label="Paid" className="tabular-nums">
                    {formatKobo(detail.paidKobo)}
                  </DataList.Item>

                  <DataList.Item label="Balance due" className="tabular-nums">
                    {formatKobo(detail.outstandingKobo)}
                  </DataList.Item>
                </DataList>

                <Separator />

                {detail.sale.note ? (
                  <div className="flex flex-col gap-1 text-sm">
                    <p className="text-foreground">Note</p>
                    <p className="text-foreground">{detail.sale.note}</p>
                  </div>
                ) : null}

                {detail.sale.note ? <Separator /> : null}

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

                <Separator />

                <PaymentHistorySection
                  payments={detail.payments}
                  canManage={canManage ?? false}
                  onReverse={handleReverse}
                  onRecordPayment={
                    canTakePayment
                      ? () => setPaymentDialogOpen(true)
                      : undefined
                  }
                />

                {canAdjust ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openCustomerDialog}
                    >
                      Change customer
                    </Button>
                    {!detail.sale.voided &&
                    canManage &&
                    detail.outstandingKobo > 0 ? (
                      <ConfirmAction
                        title={`Write off ${formatKobo(detail.outstandingKobo)}?`}
                        description="That money stops counting as owed."
                        confirmLabel="Write off"
                        onConfirm={() => handleWriteOff(detail.outstandingKobo)}
                      >
                        <Button type="button" variant="outline" size="sm">
                          Write off balance
                        </Button>
                      </ConfirmAction>
                    ) : null}
                    <ConfirmAction
                      title="Void this sale?"
                      description="The stock goes back and the money leaves revenue."
                      confirmLabel="Void"
                      onConfirm={handleVoid}
                    >
                      <Button type="button" variant="destructive" size="sm">
                        Void sale
                      </Button>
                    </ConfirmAction>
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
          saleOccurredAt={detail.sale.occurredAt}
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
