"use client";

import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  defaultPaymentFormState,
  type PaymentFormValues,
  paymentKobo,
  RecordPaymentForm,
} from "@/components/forms/RecordPaymentForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { track, useTrackOpen } from "@/lib/analytics";

type RecordPaymentDialogProps = {
  open: boolean;
  saleId: string;
  /** The most this payment may be; the host refuses anything above it. */
  outstandingKobo: number;
  /** When the sale happened; the form refuses an earlier payment date. */
  saleOccurredAt: string;
  onOpenChange: (open: boolean) => void;
};

export function RecordPaymentDialog({
  open,
  onOpenChange,
  saleId,
  outstandingKobo,
  saleOccurredAt,
}: RecordPaymentDialogProps) {
  const recordPayment = useMutation(api.inventory.recordSalePayment);
  useTrackOpen("inventory_payment_dialog_opened", open, {
    sale_id: saleId,
    outstanding_kobo: outstandingKobo,
  });

  const handleSubmit = async (values: PaymentFormValues) => {
    const amountKobo = paymentKobo(values.amount);

    try {
      await recordPayment({
        saleId,
        amountKobo,
        paidAt: new Date(values.paidAt).toISOString(),
        channel: values.channel,
        note: values.note.trim() || undefined,
      });
      track("inventory_sale_payment_recorded", {
        sale_id: saleId,
        amount_kobo: amountKobo,
        channel: values.channel,
      });
      toast.success("Payment recorded");
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not record payment", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Record a payment for this sale. Mistakes are reversed, not edited.
          </DialogDescription>
        </DialogHeader>

        <RecordPaymentForm
          outstandingKobo={outstandingKobo}
          saleOccurredAt={saleOccurredAt}
          initialFormData={defaultPaymentFormState(outstandingKobo)}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
