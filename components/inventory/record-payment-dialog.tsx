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

type RecordPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  /** The most this payment may be; the host refuses anything above it. */
  outstandingKobo: number;
  /** When the sale happened; the form refuses an earlier payment date. */
  saleOccurredAt: string;
};

export function RecordPaymentDialog({
  open,
  onOpenChange,
  saleId,
  outstandingKobo,
  saleOccurredAt,
}: RecordPaymentDialogProps) {
  const recordPayment = useMutation(api.inventory.recordSalePayment);

  const handleSubmit = async (values: PaymentFormValues) => {
    try {
      await recordPayment({
        saleId,
        amountKobo: paymentKobo(values.amount),
        paidAt: new Date(values.paidAt).toISOString(),
        channel: values.channel,
        note: values.note.trim() || undefined,
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
            Money taken against this sale.
            <br /> A mistake is reversed, never edited.
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
