"use client";

import { useMutation, useQuery } from "convex/react";
import { format, parseISO } from "date-fns";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { PaymentHistorySection } from "@/components/inventory/payment-history-section";
import { RecordPaymentDialog } from "@/components/inventory/record-payment-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { DataList } from "@/components/ui/data-list";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Receivable, SaleSummary } from "@/convex/inventory";
import { usePrivilege } from "@/hooks/usePrivilege";
import { formatKobo } from "@/lib/currency.helpers";
import { track, useTrackOpen } from "@/lib/inventory.track";
import { SaleStatusBadge } from "./sale-columns";

type DebtSheetProps = {
  customer: Receivable | null;
  onOpenChange: (open: boolean) => void;
};

export function CustomerDebtSheet({ customer, onOpenChange }: DebtSheetProps) {
  const customerId = customer?.customerId ?? "";
  const sales = useQuery(
    api.inventory.customerDebt,
    customerId ? { customerId } : "skip",
  );
  const writeOffSale = useMutation(api.inventory.writeOffSale);
  const reverseSalePayment = useMutation(api.inventory.reverseSalePayment);
  const { valid: canManage } = usePrivilege("inventory:manage");

  // The dialog is bound to one sale at a time; the section's trigger opens it.
  const [paymentSale, setPaymentSale] = useState<SaleSummary | null>(null);
  useTrackOpen("inventory_customer_debt_viewed", customer !== null, {
    customer_id: customerId || undefined,
  });

  const handleWriteOff = async (sale: SaleSummary) => {
    try {
      await writeOffSale({
        saleId: sale._id,
        amountKobo: sale.outstandingKobo,
      });
      track("inventory_sale_written_off", {
        sale_id: sale._id,
        amount_kobo: sale.outstandingKobo,
        customer_id: customerId || undefined,
      });
      toast.success("Balance written off");
    } catch (error) {
      toast.error("Could not write off balance", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleReverse = async (paymentId: string) => {
    try {
      await reverseSalePayment({ paymentId });
      track("inventory_sale_payment_reversed", {
        payment_id: paymentId,
        customer_id: customerId || undefined,
      });
      toast.success("Payment reversed");
    } catch (error) {
      toast.error("Could not reverse payment", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <>
      <Sheet
        open={customer !== null}
        onOpenChange={(open) => {
          if (!open) setPaymentSale(null);
          onOpenChange(open);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Customer debt</SheetTitle>
            <SheetDescription className="max-w-[40ch]">
              Everything this customer still owes, sale by sale.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-4 pb-8">
            {customer ? (
              <>
                {/* ponytail: sale rows repeat inside the one data table; fine
                    for a handful of unpaid sales — swap in a sales table if
                    lists grow */}
                <DataList>
                  <DataList.Item label="Customer">
                    {customer.customerName ?? "Deleted customer"}
                  </DataList.Item>

                  <DataList.Item label="Total owed" className="tabular-nums">
                    {formatKobo(customer.totalOwedKobo)}
                  </DataList.Item>

                  <DataList.Item label="Overdue" className="tabular-nums">
                    {customer.overdueKobo > 0
                      ? `${formatKobo(customer.overdueKobo)} · ${customer.daysOverdue} ${customer.daysOverdue === 1 ? "day" : "days"} late`
                      : "—"}
                  </DataList.Item>

                  {(sales ?? []).map((sale) => (
                    <Fragment key={sale._id}>
                      <DataList.Item label="Date" className="whitespace-nowrap">
                        {new Date(sale.occurredAt).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </DataList.Item>

                      <DataList.Item label="Due date">
                        {sale.dueDate
                          ? format(parseISO(sale.dueDate), "d MMM yyyy")
                          : "—"}
                      </DataList.Item>

                      <DataList.Item label="Status">
                        <SaleStatusBadge status={sale.status} />
                      </DataList.Item>

                      <DataList.Item
                        label="Balance due"
                        className="tabular-nums"
                      >
                        {formatKobo(sale.outstandingKobo)}
                      </DataList.Item>

                      <DataList.Item label="Total" className="tabular-nums">
                        {formatKobo(sale.totalKobo)}
                      </DataList.Item>
                    </Fragment>
                  ))}
                </DataList>

                <Separator />
              </>
            ) : null}

            <div className="space-y-6">
              {sales === undefined ? (
                <Skeleton className="h-[40svh] w-full" />
              ) : sales.length === 0 ? (
                <p className="text-sm text-muted-foreground">All settled up.</p>
              ) : (
                sales.map((sale, index) => (
                  <Fragment key={sale._id}>
                    {index > 0 ? <Separator /> : null}
                    <PaymentHistorySection
                      payments={sale.payments}
                      canManage={canManage}
                      onReverse={handleReverse}
                      onRecordPayment={() => setPaymentSale(sale)}
                    />
                    {canManage ? (
                      <div className="flex flex-wrap gap-2">
                        <ConfirmAction
                          title={`Write off ${formatKobo(sale.outstandingKobo)}?`}
                          description="That money stops counting as owed."
                          confirmLabel="Write off"
                          onConfirm={() => handleWriteOff(sale)}
                        >
                          <Button type="button" variant="outline" size="sm">
                            Write off
                          </Button>
                        </ConfirmAction>
                      </div>
                    ) : null}
                  </Fragment>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {paymentSale ? (
        <RecordPaymentDialog
          open
          onOpenChange={(open) => {
            if (!open) setPaymentSale(null);
          }}
          saleId={paymentSale._id}
          outstandingKobo={paymentSale.outstandingKobo}
          saleOccurredAt={paymentSale.occurredAt}
        />
      ) : null}
    </>
  );
}
