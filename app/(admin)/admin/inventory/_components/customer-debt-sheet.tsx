"use client";

import { useMutation, useQuery } from "convex/react";
import { format, parseISO } from "date-fns";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { RecordPaymentDialog } from "@/components/inventory/record-payment-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
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
import { PaymentLedger } from "./payment-ledger";
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

  // The shared dialog is bound to one sale at a time; the row it was opened
  // from keeps its balance visible while the form is up.
  const [paymentSale, setPaymentSale] = useState<SaleSummary | null>(null);

  const handleWriteOff = async (sale: SaleSummary) => {
    try {
      await writeOffSale({
        saleId: sale._id,
        amountKobo: sale.outstandingKobo,
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
                <dl className="grid grid-cols-[0.3fr_0.7fr] items-baseline gap-x-6 gap-y-4 text-sm">
                  <dt className="text-muted-foreground">Customer</dt>
                  <dd className="text-foreground">
                    {customer.customerName ?? "Deleted customer"}
                  </dd>

                  <dt className="text-muted-foreground">Total owed</dt>
                  <dd className="tabular-nums text-foreground">
                    {formatKobo(customer.totalOwedKobo)}
                  </dd>

                  <dt className="text-muted-foreground">Overdue</dt>
                  <dd className="tabular-nums text-foreground">
                    {customer.overdueKobo > 0
                      ? `${formatKobo(customer.overdueKobo)} · ${customer.daysOverdue} ${customer.daysOverdue === 1 ? "day" : "days"} late`
                      : "—"}
                  </dd>

                  {(sales ?? []).map((sale) => (
                    <Fragment key={sale._id}>
                      <dt className="text-muted-foreground">Date</dt>
                      <dd className="whitespace-nowrap text-foreground">
                        {new Date(sale.occurredAt).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </dd>

                      <dt className="text-muted-foreground">Due date</dt>
                      <dd className="text-foreground">
                        {sale.dueDate
                          ? format(parseISO(sale.dueDate), "d MMM yyyy")
                          : "—"}
                      </dd>

                      <dt className="text-muted-foreground">Status</dt>
                      <dd>
                        <SaleStatusBadge status={sale.status} />
                      </dd>

                      <dt className="text-muted-foreground">Balance due</dt>
                      <dd className="tabular-nums text-foreground">
                        {formatKobo(sale.outstandingKobo)}
                      </dd>

                      <dt className="text-muted-foreground">Total</dt>
                      <dd className="tabular-nums text-foreground">
                        {formatKobo(sale.totalKobo)}
                      </dd>
                    </Fragment>
                  ))}
                </dl>

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
                    <PaymentLedger
                      payments={sale.payments}
                      canManage={canManage}
                      onReverse={handleReverse}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setPaymentSale(sale)}
                      >
                        Record payment
                      </Button>
                      {canManage ? (
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
                      ) : null}
                    </div>
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
