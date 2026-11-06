"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { SupplierFormDialog } from "@/components/inventory/supplier-form-dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Form,
  FormControl,
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
import { api } from "@/convex/_generated/api";
import { currencyFormatter } from "@/lib/currency.helpers";

function isBlankOrNonNegative(value: string) {
  return value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0);
}

function isPositive(value: string) {
  return !Number.isNaN(Number(value)) && Number(value) > 0;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

const lineSchema = z.object({
  productId: z.string().min(1, { message: "Choose a product" }),
  unitId: z.string().min(1, { message: "Choose a unit" }),
  quantity: z.string().trim().refine(isPositive, {
    message: "Quantity must be more than zero",
  }),
  unitCostNaira: z.string().trim().refine(isBlankOrNonNegative, {
    message: "Cost must be 0 or more",
  }),
});

const purchaseFormSchema = z.object({
  supplierId: z.string().optional(),
  occurredAt: z.string().min(1, { message: "Purchase date is required" }),
  amountPaidNaira: z.string().trim().refine(isBlankOrNonNegative, {
    message: "Amount paid must be 0 or more",
  }),
  freightNaira: z.string().trim().refine(isBlankOrNonNegative, {
    message: "Freight must be 0 or more",
  }),
  discountNaira: z.string().trim().refine(isBlankOrNonNegative, {
    message: "Discount must be 0 or more",
  }),
  note: z.string().trim().optional(),
  lines: z.array(lineSchema).min(1, { message: "Add at least one line" }),
});

export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

export const purchaseFormDefaultState: PurchaseFormValues = {
  supplierId: "",
  occurredAt: todayInputValue(),
  amountPaidNaira: "",
  freightNaira: "",
  discountNaira: "",
  note: "",
  lines: [{ productId: "", unitId: "", quantity: "1", unitCostNaira: "" }],
};

export function toKobo(value: string) {
  return Math.round(Number(value || 0) * 100);
}

type PurchaseFormProps = {
  isLoading?: boolean;
  onSubmit: (values: PurchaseFormValues) => Promise<void>;
  onCancel?: () => void;
};

export function PurchaseForm({
  isLoading = false,
  onSubmit,
  onCancel,
}: PurchaseFormProps) {
  const data = useQuery(api.inventory.purchaseFormData, {});
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: purchaseFormDefaultState,
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const watchedLines = useWatch({ control: form.control, name: "lines" });
  const totalKobo = (watchedLines ?? []).reduce((sum, line) => {
    const quantity = Number(line?.quantity);
    const cost = Number(line?.unitCostNaira);
    if (!Number.isFinite(quantity) || !Number.isFinite(cost)) return sum;
    return sum + Math.round(quantity * cost * 100);
  }, 0);

  if (data === undefined) {
    return <div className="h-40 animate-pulse rounded-md bg-muted" />;
  }

  const productById = new Map(
    data.products.map((product) => [product.productId, product]),
  );

  // A new product starts on its base unit at the catalogue cost, so most lines
  // need only a quantity and a cost override.
  const applyProductDefaults = (index: number, productId: string) => {
    const chosen = productById.get(productId);
    form.setValue(`lines.${index}.unitId`, chosen?.baseUnitId ?? "");
    form.setValue(
      `lines.${index}.unitCostNaira`,
      chosen ? String(chosen.costPriceKobo / 100) : "",
    );
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier (optional)</FormLabel>
                  <div className="flex gap-2">
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? "" : value)
                      }
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="No supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No supplier</SelectItem>
                        {data.suppliers.map((supplier) => (
                          <SelectItem key={supplier._id} value={supplier._id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="New supplier"
                      onClick={() => setSupplierDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="occurredAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-[1.4fr_0.9fr_0.6fr_0.9fr_auto] gap-2 text-xs font-medium text-muted-foreground">
              <span>Product</span>
              <span>Unit</span>
              <span>Qty</span>
              <span>Cost per unit (₦)</span>
              <span />
            </div>

            {fields.map((field, index) => {
              const product = productById.get(
                watchedLines?.[index]?.productId ?? "",
              );
              return (
                <div
                  key={field.id}
                  className="grid grid-cols-[1.4fr_0.9fr_0.6fr_0.9fr_auto] items-start gap-2"
                >
                  <FormField
                    control={form.control}
                    name={`lines.${index}.productId`}
                    render={({ field: productField }) => (
                      <FormItem>
                        <Select
                          onValueChange={(value) => {
                            productField.onChange(value);
                            applyProductDefaults(index, value);
                          }}
                          value={productField.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {data.products.map((option) => (
                              <SelectItem
                                key={option.productId}
                                value={option.productId}
                              >
                                {option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`lines.${index}.unitId`}
                    render={({ field: unitField }) => (
                      <FormItem>
                        <Select
                          onValueChange={unitField.onChange}
                          value={unitField.value}
                          disabled={!product}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(product?.units ?? []).map((unit) => (
                              <SelectItem key={unit.unitId} value={unit.unitId}>
                                {unit.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`lines.${index}.quantity`}
                    render={({ field: quantityField }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            aria-label={`Line ${index + 1} quantity`}
                            value={quantityField.value}
                            onChange={quantityField.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`lines.${index}.unitCostNaira`}
                    render={({ field: costField }) => (
                      <FormItem>
                        <FormControl>
                          <CurrencyInput
                            {...costField}
                            step={100}
                            placeholder="0.00"
                            onChange={costField.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove line ${index + 1}`}
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  productId: "",
                  unitId: "",
                  quantity: "1",
                  unitCostNaira: "",
                })
              }
            >
              <Plus className="h-4 w-4" />
              Add line
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="amountPaidNaira"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount paid (₦)</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      {...field}
                      step={100}
                      placeholder="Full total"
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="freightNaira"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Freight (₦, optional)</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      {...field}
                      step={100}
                      placeholder="0.00"
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discountNaira"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount (₦, optional)</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      {...field}
                      step={100}
                      placeholder="0.00"
                      onChange={field.onChange}
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
                <FormLabel>Note (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g. Bought at Balogun market"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <p className="text-sm text-muted-foreground">
            Total from lines:{" "}
            <span className="font-medium text-foreground">
              {currencyFormatter.format(totalKobo / 100)}
            </span>
          </p>

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
                : "Record purchase"}
            </Button>
          </div>
        </form>
      </Form>

      <SupplierFormDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        onCreated={(supplierId) => form.setValue("supplierId", supplierId)}
      />
    </>
  );
}
