"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { parseAmountInput } from "@/lib/currency.helpers";

export type PaymentChannel = "cash" | "pos" | "transfer";

export const paymentChannelLabels: Record<PaymentChannel, string> = {
  cash: "Cash",
  pos: "POS",
  transfer: "Transfer",
};

/** Naira typed in the field, as whole kobo. */
export function paymentKobo(amountNaira: string): number {
  return Math.round(parseAmountInput(amountNaira) * 100);
}

/** Why this amount cannot be taken, or null when it can. */
export function paymentAmountError(
  amountNaira: string,
  outstandingKobo: number,
): string | null {
  const kobo = paymentKobo(amountNaira);
  if (kobo <= 0) return "Enter an amount more than zero.";
  if (kobo > outstandingKobo) return "That is more than the balance due.";
  return null;
}

/** Today as YYYY-MM-DD in the shop's own timezone. */
function todayInputValue() {
  return new Date().toLocaleDateString("en-CA");
}

type RecordPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  /** The most this payment may be; the host refuses anything above it. */
  outstandingKobo: number;
};

export function RecordPaymentDialog({
  open,
  onOpenChange,
  saleId,
  outstandingKobo,
}: RecordPaymentDialogProps) {
  const recordPayment = useMutation(api.inventory.recordSalePayment);
  const [amount, setAmount] = useState(() =>
    (outstandingKobo / 100).toFixed(2),
  );
  const [paidAt, setPaidAt] = useState(todayInputValue);
  const [channel, setChannel] = useState<PaymentChannel>("cash");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const amountError = paymentAmountError(amount, outstandingKobo);

  const handleSave = async () => {
    if (amountError || !paidAt) return;

    setIsSaving(true);
    try {
      await recordPayment({
        saleId,
        amountKobo: paymentKobo(amount),
        paidAt: new Date(paidAt).toISOString(),
        channel,
        note: note.trim() || undefined,
      });
      toast.success("Payment recorded");
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not record payment", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Money taken against this sale. A mistake is reversed, never edited.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="payment-amount">Amount</Label>
          <CurrencyInput
            id="payment-amount"
            variant="keyboard"
            step={100}
            value={amount}
            onChange={setAmount}
            placeholder="0.00"
            aria-invalid={amountError !== null}
          />
          <p className="text-xs text-muted-foreground">
            {amountError ?? "Balance due is prefilled."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="payment-date">Date</Label>
            <Input
              id="payment-date"
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-channel">Tender</Label>
            <Select
              value={channel}
              onValueChange={(value) => setChannel(value as PaymentChannel)}
            >
              <SelectTrigger id="payment-channel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="pos">POS</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment-note">Note (optional)</Label>
          <Textarea
            id="payment-note"
            placeholder="e.g. Balance paid by her brother"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={amountError !== null || !paidAt || isSaving}
          >
            {isSaving ? "Recording..." : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
