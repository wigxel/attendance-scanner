"use client";

import { Button } from "@/components/ui/button";
import type { SalePaymentRow } from "@/convex/inventory";
import { PaymentLedger } from "./payment-ledger";

type PaymentHistorySectionProps = {
  payments: SalePaymentRow[];
  canManage: boolean;
  onReverse: (paymentId: string) => void;
  /**
   * The explicit record trigger. Pass a callback to get the standard button
   * in the heading row; omit when the sheet takes no further money (nothing
   * owed, sale voided) or keeps the action elsewhere. The sheet owns the
   * dialog the callback opens.
   */
  onRecordPayment?: () => void;
};

/**
 * The identical payment section every money sheet shows: a "Payments"
 * heading with the sheet's explicit record trigger, then the shared ledger.
 * Sheets render this alone; they never hand-write the heading row.
 */
export function PaymentHistorySection({
  payments,
  canManage,
  onReverse,
  onRecordPayment,
}: PaymentHistorySectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Payments</p>
        {onRecordPayment ? (
          <Button type="button" size="xs" onClick={onRecordPayment}>
            Record payment
          </Button>
        ) : null}
      </div>

      <PaymentLedger
        payments={payments}
        canManage={canManage}
        onReverse={onReverse}
      />
    </div>
  );
}
