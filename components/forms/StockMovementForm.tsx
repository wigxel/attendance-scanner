"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { StepperInput } from "@/components/ui/stepper-input";
import { Textarea } from "@/components/ui/textarea";

const movementKinds = ["restock", "usage", "adjustment"] as const;

export type MovementKind = (typeof movementKinds)[number];

export const movementKindLabels: Record<MovementKind, string> = {
  restock: "Restock",
  usage: "Usage",
  adjustment: "Adjustment",
};

function toDateTimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return `${day}T${time}`;
}

export function defaultMovementFormState(): MovementFormValues {
  return {
    kind: "restock",
    quantity: 0,
    occurredAt: toDateTimeInput(new Date()),
    note: "",
  };
}

const movementFormSchema = z
  .object({
    kind: z.enum(movementKinds),
    quantity: z.coerce
      .number()
      .refine(Number.isFinite, { message: "Enter a quantity" }),
    occurredAt: z.string().min(1, { message: "When did this happen?" }),
    note: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.kind === "adjustment" && values.quantity < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message: "The counted quantity cannot be negative",
      });
    }
    if (values.kind !== "adjustment" && values.quantity <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message: "Enter a quantity more than zero",
      });
    }
    if (values.kind !== "usage" && !values.note.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "A note is required for restock and adjustment",
      });
    }
  });

export type MovementFormValues = z.infer<typeof movementFormSchema>;

type StockMovementFormProps = {
  initialFormData?: MovementFormValues;
  isLoading?: boolean;
  baseUnitName: string;
  currentQuantity?: number;
  onSubmit: (values: MovementFormValues) => Promise<void>;
  onCancel?: () => void;
};

export function StockMovementForm({
  initialFormData,
  isLoading = false,
  baseUnitName,
  currentQuantity,
  onSubmit,
  onCancel,
}: StockMovementFormProps) {
  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: initialFormData ?? defaultMovementFormState(),
  });
  const kind = form.watch("kind");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kind</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {movementKinds.map((value) => (
                    <SelectItem key={value} value={value}>
                      {movementKindLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Restock adds stock, usage takes it out, adjustment sets it to
                the counted quantity.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {kind === "adjustment"
                  ? `Counted quantity (${baseUnitName})`
                  : `Amount (${baseUnitName})`}
              </FormLabel>
              <FormControl>
                <StepperInput
                  {...field}
                  value={
                    Number.isFinite(field.value) ? String(field.value) : ""
                  }
                  onChange={(value) =>
                    field.onChange(value === "" ? 0 : Number(value))
                  }
                />
              </FormControl>
              <FormDescription>
                {currentQuantity === undefined
                  ? "Recorded in the product's base unit."
                  : `In stock now: ${currentQuantity} ${baseUnitName}.`}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="occurredAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Occurred at</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormDescription>
                When this happened. Defaults to now — change it if you&apos;re
                entering it late.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel optional={kind === "usage"}>Note</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g. Delivery from supplier"
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
              ? "Saving..."
              : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
