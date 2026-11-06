"use client";

import { Plus, Trash2, TriangleAlert } from "lucide-react";
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
import { TableCell, TableRow } from "@/components/ui/table";
import type { PurchaseFormProduct } from "@/convex/inventory";
import type { PurchaseFormValues } from "./purchase-form";

const amountFormatter = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type PurchaseLine = PurchaseFormValues["lines"][number];

type PurchaseLineRowProps = {
  index: number;
  control: Control<PurchaseFormValues>;
  line?: Partial<PurchaseLine>;
  product?: PurchaseFormProduct;
  products: PurchaseFormProduct[];
  lineByProduct: Map<string, number>;
  canRemove: boolean;
  onProductChange: (index: number, productId: string) => void;
  onCreateProduct: (index: number) => void;
  onRemove: (index: number) => void;
};

export function PurchaseLineRow({
  index,
  control,
  line,
  product,
  products,
  lineByProduct,
  canRemove,
  onProductChange,
  onCreateProduct,
  onRemove,
}: PurchaseLineRowProps) {
  const quantity = Number(line?.quantity);
  const cost = Number(line?.unitCostNaira);
  const lineTotalNaira =
    Number.isFinite(quantity) && Number.isFinite(cost) ? quantity * cost : 0;

  const productId = line?.productId ?? "";
  const firstLine = productId ? lineByProduct.get(productId) : undefined;
  const isDuplicate = firstLine !== undefined && firstLine !== index + 1;

  return (
    <TableRow>
      <TableCell className="align-middle text-center">
        {isDuplicate ? (
          <span
            title={`This product is already on line ${firstLine}.`}
            className="text-destructive inline-flex items-center gap-1 text-xs font-medium"
          >
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
            Dup
            <span className="sr-only">
              This product is already on line {firstLine}.
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground tabular-nums">
            {index + 1}
          </span>
        )}
      </TableCell>

      <TableCell className="align-middle">
        <FormField
          control={control}
          name={`lines.${index}.productId`}
          render={({ field }) => (
            <FormItem>
              <Select
                onValueChange={(value) => {
                  if (value === "create") {
                    onCreateProduct(index);
                    return;
                  }

                  onProductChange(index, value);
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose product" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="create">
                    <Plus className="h-3.5 w-3.5" />
                    Create new product
                  </SelectItem>
                  {products.map((option) => {
                    const takenOn = lineByProduct.get(option.productId);
                    const taken =
                      takenOn !== undefined && takenOn !== index + 1;

                    return (
                      <SelectItem
                        key={option.productId}
                        value={option.productId}
                        disabled={taken}
                      >
                        {option.name}
                        {taken ? (
                          <span className="text-muted-foreground">
                            {" "}
                            (line {takenOn})
                          </span>
                        ) : null}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </TableCell>

      <TableCell className="align-middle">
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
                  onValueChange={field.onChange}
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
      </TableCell>

      <TableCell className="align-middle">
        <FormField
          control={control}
          name={`lines.${index}.unitCostNaira`}
          render={({ field }) => (
            <FormItem>
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
      </TableCell>

      <TableCell className="align-middle text-right whitespace-nowrap tabular-nums">
        {amountFormatter.format(lineTotalNaira)}
      </TableCell>

      <TableCell className="align-middle">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove line ${index + 1}`}
          disabled={!canRemove}
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
