"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { parseAmountInput } from "@/lib/currency.helpers";
import { PAYMENT_CHANNELS, paymentChannelLabels } from "@/lib/payment-channel";

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

/** The payment date input works in days; compare days, not instants. */
function localDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA");
}

/** Why this date cannot be when the money arrived, or null when it can. */
export function paymentDateError(
  paidAt: string,
  saleOccurredAtISO: string,
): string | null {
  if (localDay(paidAt) < localDay(saleOccurredAtISO)) {
    return "That date is before the sale was recorded.";
  }
  if (paidAt > todayInputValue()) return "That date is in the future.";
  return null;
}

export function defaultPaymentFormState(
  outstandingKobo: number,
): PaymentFormValues {
  return {
    amount: (outstandingKobo / 100).toFixed(2),
    paidAt: todayInputValue(),
    channel: "cash",
    note: "",
  };
}

/** The balance due caps the amount, and the sale's day caps the date. */
const paymentFormSchema = (
  outstandingKobo: number,
  saleOccurredAtISO: string,
) =>
  z
    .object({
      amount: z.string(),
      paidAt: z.string().min(1, { message: "When was this paid?" }),
      channel: z.enum(PAYMENT_CHANNELS),
      note: z.string(),
    })
    .superRefine((values, ctx) => {
      const amountError = paymentAmountError(values.amount, outstandingKobo);
      if (amountError) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: amountError,
        });
      }

      const dateError = paymentDateError(values.paidAt, saleOccurredAtISO);
      if (dateError) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paidAt"],
          message: dateError,
        });
      }
    });

export type PaymentFormValues = z.infer<ReturnType<typeof paymentFormSchema>>;

type RecordPaymentFormProps = {
  initialFormData?: PaymentFormValues;
  isLoading?: boolean;
  /** The most this payment may be; the schema refuses anything above it. */
  outstandingKobo: number;
  /** When the sale happened; the schema refuses an earlier payment date. */
  saleOccurredAt: string;
  onSubmit: (values: PaymentFormValues) => Promise<void>;
  onCancel?: () => void;
};

export function RecordPaymentForm({
  initialFormData,
  isLoading = false,
  outstandingKobo,
  saleOccurredAt,
  onSubmit,
  onCancel,
}: RecordPaymentFormProps) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema(outstandingKobo, saleOccurredAt)),
    defaultValues: initialFormData ?? defaultPaymentFormState(outstandingKobo),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <FormDescription>Balance due is prefilled.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="paidAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    min={localDay(saleOccurredAt)}
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
            name="channel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tender</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PAYMENT_CHANNELS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {paymentChannelLabels[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel optional>Note</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g. Balance paid by her brother"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || isLoading}
          >
            {form.formState.isSubmitting || isLoading
              ? "Recording..."
              : "Record payment"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
