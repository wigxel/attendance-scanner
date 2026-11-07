"use client";

import { Trash2 } from "lucide-react";
import type { Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  FormControl,
  FormField,
  FormItem,
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
import type { SaleFormProduct } from "@/convex/inventory";
import type { SaleFormValues } from "./sale-form";

const amountFormatter = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type SaleLine = SaleFormValues["lines"][number];

type SaleLineRowProps = {
  index: number;
  control: Control<SaleFormValues>;
  line?: Partial<SaleLine>;
  product?: SaleFormProduct;
  products: SaleFormProduct[];
  canRemove: boolean;
  onProductChange: (index: number, productId: string) => void;
  onUnitChange: (index: number, unitId: string) => void;
  onRemove: (index: number) => void;
};

export function SaleLineRow({
  index,
  control,
  line,
  product,
  products,
  canRemove,
  onProductChange,
  onUnitChange,
  onRemove,
}: SaleLineRowProps) {
  const quantity = Number(line?.quantity);
  const price = Number(line?.unitPriceNaira);
  const lineTotal =
    Number.isFinite(quantity) && Number.isFinite(price) ? quantity * price : 0;

  return (
    <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-[2rem_minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_7rem_2.5rem] md:items-start md:border-0 md:p-0">
      <p className="hidden text-sm text-muted-foreground md:block">
        <span className="tabular-nums">{index + 1}</span>
      </p>

      <FormField
        control={control}
        name={`lines.${index}.productId`}
        render={({ field }) => (
          <FormItem>
            <p className="text-xs text-muted-foreground md:hidden">Product</p>
            <Select
              onValueChange={(value) => onProductChange(index, value)}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose product" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {products.map((option) => (
                  <SelectItem key={option.productId} value={option.productId}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div>
        <p className="mb-1 text-xs text-muted-foreground md:hidden">
          Qty / unit
        </p>
        <div className="flex items-start gap-2">
          <FormField
            control={control}
            name={`lines.${index}.quantity`}
            render={({ field }) => (
              <FormItem className="shrink-0">
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    aria-label={`Line ${index + 1} quantity`}
                    className="w-20 min-w-[3.125rem] tabular-nums"
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`lines.${index}.unitId`}
            render={({ field }) => (
              <FormItem className="min-w-0 flex-1">
                <Select
                  onValueChange={(value) => onUnitChange(index, value)}
                  value={field.value}
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
        </div>
      </div>

      <FormField
        control={control}
        name={`lines.${index}.unitPriceNaira`}
        render={({ field }) => (
          <FormItem>
            <p className="text-xs text-muted-foreground md:hidden">
              Price per unit
            </p>
            <FormControl>
              <CurrencyInput
                {...field}
                step={10}
                placeholder="0.00"
                className="tabular-nums"
                variant="keyboard"
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex items-center justify-between gap-2 md:block md:pt-2 md:text-right">
        <p className="text-xs text-muted-foreground md:hidden">Line total</p>
        <p className="whitespace-nowrap tabular-nums">
          {amountFormatter.format(lineTotal)}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Remove line ${index + 1}`}
        disabled={!canRemove}
        onClick={() => onRemove(index)}
        className="justify-self-end"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
