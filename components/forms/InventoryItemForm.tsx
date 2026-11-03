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

const inventoryItemSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  sku: z.string().optional(),
  unit: z.string().min(1, { message: "Unit is required" }),
  quantity: z.number().min(0, { message: "Quantity cannot be negative" }),
  reorderLevel: z
    .number()
    .min(0, { message: "Reorder level cannot be negative" }),
  costPrice: z.number().min(0, { message: "Cost cannot be negative" }),
});

export type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;

interface InventoryItemFormProps {
  initialFormData?: Partial<InventoryItemFormValues>;
  isLoading?: boolean;
  onSubmit: (values: InventoryItemFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

const defaultState: InventoryItemFormValues = {
  name: "",
  sku: "",
  unit: "unit",
  quantity: 0,
  reorderLevel: 0,
  costPrice: 0,
};

function numberField(value: string, fallback: number) {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function InventoryItemForm({
  initialFormData,
  isLoading = false,
  onSubmit,
  onCancel,
  submitLabel = "Add item",
}: InventoryItemFormProps) {
  const isEditing = initialFormData?.name !== undefined;

  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: { ...defaultState, ...initialFormData },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g. Bottled water"
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="bottle" disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    placeholder="optional"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Opening quantity</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min={0}
                  disabled={isLoading || isEditing}
                  onChange={(e) =>
                    field.onChange(numberField(e.target.value, 0))
                  }
                />
              </FormControl>
              {isEditing && (
                <FormDescription>
                  Change stock with a purchase, restock or usage entry.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="reorderLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Low-stock level</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={0}
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
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost per unit (₦)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={0}
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
        </div>

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
            {isLoading ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
