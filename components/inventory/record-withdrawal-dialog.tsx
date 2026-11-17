"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { paymentKobo } from "@/components/forms/RecordPaymentForm";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";

/** Today as YYYY-MM-DD in the shop's own timezone. */
function todayInputValue() {
  return new Date().toLocaleDateString("en-CA");
}

/** Yesterday as YYYY-MM-DD — the oldest date a withdrawal may carry. */
function yesterdayInputValue() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA");
}

type WithdrawalFormValues = {
  amount: string;
  withdrawnAt: string;
  note: string;
};

/** The drawer figure caps the amount, and today caps the date. */
const withdrawalFormSchema = (cashInHandKobo: number) =>
  z
    .object({
      amount: z.string(),
      withdrawnAt: z.string().min(1, { message: "When was this taken?" }),
      note: z.string().trim().min(1, { message: "A note is required." }),
    })
    .superRefine((values, ctx) => {
      const kobo = paymentKobo(values.amount);
      if (kobo <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: "Enter an amount more than zero.",
        });
      } else if (kobo > cashInHandKobo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: "That is more than the cash in hand.",
        });
      }

      if (values.withdrawnAt > todayInputValue()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["withdrawnAt"],
          message: "That date is in the future.",
        });
      } else if (values.withdrawnAt < yesterdayInputValue()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["withdrawnAt"],
          message: "Only today and yesterday can be recorded.",
        });
      }
    });

type RecordWithdrawalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The most that can be taken right now; the host refuses anything above it. */
  cashInHandKobo: number;
};

export function RecordWithdrawalDialog({
  open,
  onOpenChange,
  cashInHandKobo,
}: RecordWithdrawalDialogProps) {
  const recordWithdrawal = useMutation(api.inventory.recordCashWithdrawal);
  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalFormSchema(cashInHandKobo)),
    defaultValues: {
      amount: "",
      withdrawnAt: todayInputValue(),
      note: "",
    },
  });

  const handleSubmit = async (values: WithdrawalFormValues) => {
    try {
      await recordWithdrawal({
        amountKobo: paymentKobo(values.amount),
        withdrawnAt: new Date(values.withdrawnAt).toISOString(),
        note: values.note.trim(),
      });
      toast.success("Withdrawal recorded");
      form.reset({ amount: "", withdrawnAt: todayInputValue(), note: "" });
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not record withdrawal", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record withdrawal</DialogTitle>
          <DialogDescription>
            Money taken out of the drawer. Stock, sales, and purchases are
            unaffected. Mistakes are reversed, not edited.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      {...field}
                      variant="keyboard"
                      step={100}
                      placeholder="0.00"
                    />
                  </FormControl>
                  <FormDescription>
                    Cash in-hand right now: ₦{(cashInHandKobo / 100).toFixed(2)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="withdrawnAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      min={yesterdayInputValue()}
                      max={todayInputValue()}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Restock run to the market"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Recording..." : "Record"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
