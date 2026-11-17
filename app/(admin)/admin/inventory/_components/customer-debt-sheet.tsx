"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { RecordPaymentDialog } from "@/components/inventory/record-payment-dialog";
import { Button } from "@/components/ui/button";
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
import { currencyFormatter } from "@/lib/currency.helpers";
import { SaleStatusBadge } from "./sale-columns";

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 2,
});

function formatKobo(value: number) {
  return currencyFormatter.format(value / 100);
}

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
  const { valid: canManage } = usePrivilege("inventory:manage");

  // The shared dialog is bound to one sale at a time; the row it was opened
  // from keeps its balance visible while the form is up.
  const [paymentSale, setPaymentSale] = useState<SaleSummary | null>(null);

  const handleWriteOff = async (sale: SaleSummary) => {
    const ok = window.confirm(
      `Write off ${formatKobo(sale.outstandingKobo)} for this sale? That money stops counting as owed.`,
    );
    if (!ok) return;

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
            <SheetTitle>
              {customer?.customerName ?? "Deleted customer"}
            </SheetTitle>
            <SheetDescription>
              {customer
                ? `Owes ${formatKobo(customer.totalOwedKobo)} in total.`
                : null}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 px-4 pb-8">
            {sales === undefined ? (
              <Skeleton className="h-[40svh] w-full" />
            ) : sales.length === 0 ? (
              <p className="text-sm text-muted-foreground">All settled up.</p>
            ) : (
              sales.map((sale) => (
                <div key={sale._id} className="rounded-md border px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm">
                      {new Date(sale.occurredAt).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <SaleStatusBadge status={sale.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-sm tabular-nums">
                      {nairaFormatter.format(sale.totalKobo / 100)}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {nairaFormatter.format(sale.outstandingKobo / 100)} due
                      </span>
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setPaymentSale(sale)}
                      >
                        Record payment
                      </Button>
                      {canManage ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleWriteOff(sale)}
                        >
                          Write off
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
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
