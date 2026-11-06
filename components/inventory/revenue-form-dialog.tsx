"use client";

import { useMutation } from "convex/react";
import { format } from "date-fns";
import { type FormEvent, useState } from "react";
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
import { api } from "@/convex/_generated/api";
import { parseAmountInput } from "@/lib/currency.helpers";

const channels = [
  { key: "cash", label: "Cash" },
  { key: "pos", label: "POS" },
  { key: "transfer", label: "Transfer" },
] as const;

type RevenueChannelKey = (typeof channels)[number]["key"];

const emptyAmounts: Record<RevenueChannelKey, string> = {
  cash: "",
  pos: "",
  transfer: "",
};

type RevenueFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The POS terminal gives daily totals, not line items. One row per day and
 * channel is what the metrics page reads and what a ledger importer will write.
 */
export function RevenueFormDialog({
  open,
  onOpenChange,
}: RevenueFormDialogProps) {
  const setRevenueTotal = useMutation(api.inventory.setRevenueTotal);
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [amounts, setAmounts] = useState(emptyAmounts);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const filled = channels.filter(({ key }) => amounts[key].trim() !== "");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (filled.length === 0) {
      toast.error("Enter at least one channel total");
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all(
        filled.map(({ key }) =>
          setRevenueTotal({
            date,
            channel: key,
            amountKobo: Math.round(parseAmountInput(amounts[key]) * 100),
            note: note.trim() || undefined,
          }),
        ),
      );
      toast.success("Shop sales recorded");
      setAmounts(emptyAmounts);
      setNote("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not record shop sales", {
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
          <DialogTitle>Record shop sales</DialogTitle>
          <DialogDescription>
            The terminal only gives a total per day, so enter what each channel
            took. Leave a channel blank to keep it as it is; enter 0 to clear
            it.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="revenue-date">Day</Label>
            <Input
              id="revenue-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          {channels.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`revenue-${key}`}>{label}</Label>
              <CurrencyInput
                id={`revenue-${key}`}
                value={amounts[key]}
                onChange={(value) =>
                  setAmounts((current) => ({ ...current, [key]: value }))
                }
                placeholder="0.00"
              />
            </div>
          ))}

          <div className="space-y-2">
            <Label htmlFor="revenue-note">Note (optional)</Label>
            <Input
              id="revenue-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. market day"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save totals"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
