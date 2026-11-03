"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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

export const MOVEMENT_KINDS = [
  {
    value: "purchase",
    label: "Purchase",
    hint: "Bought stock. Adds to the count.",
  },
  {
    value: "restock",
    label: "Restock",
    hint: "Stock added back. Adds to the count.",
  },
  {
    value: "usage",
    label: "Usage",
    hint: "Consumed or sold. Removes from the count.",
  },
  {
    value: "adjustment",
    label: "Adjustment",
    hint: "Correct a stock count. Use a negative number to remove.",
  },
] as const;

const stockMovementSchema = z.object({
  kind: z.enum(["purchase", "restock", "usage", "adjustment"]),
  quantity: z.number().refine((value) => value !== 0, {
    message: "Quantity cannot be zero",
  }),
  unitCost: z.number().min(0, { message: "Cost cannot be negative" }),
  note: z.string().optional(),
});

export type StockMovementFormValues = z.infer<typeof stockMovementSchema>;

interface StockMovementFormProps {
  itemName: string;
  isLoading?: boolean;
  onSubmit: (values: StockMovementFormValues) => Promise<void>;
  onCancel?: () => void;
}

const defaultState: StockMovementFormValues = {
  kind: "restock",
  quantity: 1,
  unitCost: 0,
  note: "",
};

function numberField(value: string, fallback: number) {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function StockMovementForm({
  itemName,
  isLoading = false,
  onSubmit,
  onCancel,
}: StockMovementFormProps) {
  const form = useForm<StockMovementFormValues>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: defaultState,
  });

  const kind = form.watch("kind");
  const hint = MOVEMENT_KINDS.find((k) => k.value === kind)?.hint;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entry type</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MOVEMENT_KINDS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hint && <FormDescription>{hint}</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    disabled={isLoading}
                    onChange={(e) =>
                      field.onChange(numberField(e.target.value, 0))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unitCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost per unit (₦)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={0}
                    disabled={isLoading || kind !== "purchase"}
                    onChange={(e) =>
                      field.onChange(numberField(e.target.value, 0))
                    }
                  />
                </FormControl>
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
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder={`e.g. supplier invoice for ${itemName}`}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Record entry"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
