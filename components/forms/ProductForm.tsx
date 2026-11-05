"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
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
import { api } from "@/convex/_generated/api";

function isBlankOrNonNegative(value: string) {
  return value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0);
}

const productFormSchema = z.object({
  name: z.string().trim().min(1, { message: "Product name is required" }),
  sku: z.string().trim().optional(),
  baseUnitId: z.string().min(1, { message: "Base unit is required" }),
  reorderLevel: z.coerce
    .number()
    .int({ message: "Reorder level must be a whole number" })
    .min(0, { message: "Reorder level cannot be negative" }),
  costPriceNaira: z.coerce
    .number()
    .min(0, { message: "Cost price cannot be negative" }),
  sellPriceNaira: z.string().trim().refine(isBlankOrNonNegative, {
    message: "Sell price must be 0 or more",
  }),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const productFormDefaultState: ProductFormValues = {
  name: "",
  sku: "",
  baseUnitId: "",
  reorderLevel: 4,
  costPriceNaira: 0,
  sellPriceNaira: "",
};

type ProductFormProps = {
  initialFormData?: ProductFormValues;
  isLoading?: boolean;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel?: () => void;
};

export function ProductForm({
  initialFormData,
  isLoading = false,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const units = useQuery(api.inventory.listUnits, {});

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialFormData ?? productFormDefaultState,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Peak Milk 400g" {...field} />
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
              <FormLabel>SKU (optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. PKM-400" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="baseUnitId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Base unit</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose base unit" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(units ?? []).map((unit) => (
                    <SelectItem key={unit._id} value={unit._id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                The unit you stock and count this product in — for example a
                pack, bottle, or carton.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reorderLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reorder level</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  {...field}
                  onChange={(event) =>
                    field.onChange(event.target.valueAsNumber)
                  }
                />
              </FormControl>
              <FormDescription>
                The stock level that should trigger a reorder.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="costPriceNaira"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost price (₦)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    {...field}
                    onChange={(event) =>
                      field.onChange(event.target.valueAsNumber || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sellPriceNaira"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sell price (₦, optional)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
              : "Save product"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
