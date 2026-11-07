"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CustomerCombobox } from "@/components/forms/CustomerCombobox";
import { SaleLineRow } from "@/components/inventory/sale-line-row";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { SaleFormProduct } from "@/convex/inventory";
import { currencyFormatter } from "@/lib/currency.helpers";

const SALES_PATH = "/admin/inventory/sales";

function isBlankOrNonNegative(value: string) {
  return value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0);
}

function isPositive(value: string) {
  return !Number.isNaN(Number(value)) && Number(value) > 0;
}

function toKobo(value: string) {
  return Math.round(Number(value || 0) * 100);
}

const lineSchema = z.object({
  productId: z.string().min(1, { message: "Choose a product" }),
  unitId: z.string().min(1, { message: "Choose a unit" }),
  quantity: z.string().trim().refine(isPositive, {
    message: "Quantity must be more than zero",
  }),
  unitPriceNaira: z.string().trim().refine(isBlankOrNonNegative, {
    message: "Price must be 0 or more",
  }),
});

const saleFormSchema = z.object({
  channel: z.enum(["cash", "pos", "transfer"]),
  customerId: z.string().optional(),
  note: z.string().trim().optional(),
  lines: z.array(lineSchema).min(1, { message: "Add at least one line" }),
});

export type SaleFormValues = z.infer<typeof saleFormSchema>;

export const saleFormDefaultState: SaleFormValues = {
  channel: "cash",
  customerId: "",
  note: "",
  lines: [{ productId: "", unitId: "", quantity: "1", unitPriceNaira: "" }],
};

/** Sell price per base unit, scaled to the unit the line is sold in. */
function priceForUnit(product: SaleFormProduct | undefined, unitId: string) {
  const unit = product?.units.find((option) => option.unitId === unitId);
  if (!unit || product?.sellPriceKobo === undefined) return "";
  return String((product.sellPriceKobo * unit.factorToBase) / 100);
}

export function SaleForm() {
  const router = useRouter();
  const recordSale = useMutation(api.inventory.recordSale);
  const data = useQuery(api.inventory.saleFormData, {});

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: saleFormDefaultState,
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const watchedLines = useWatch({ control: form.control, name: "lines" });
  const customerId = useWatch({ control: form.control, name: "customerId" });
  const totalKobo = (watchedLines ?? []).reduce((sum, line) => {
    const quantity = Number(line?.quantity);
    const price = Number(line?.unitPriceNaira);
    if (!Number.isFinite(quantity) || !Number.isFinite(price)) return sum;
    return sum + Math.round(quantity * price * 100);
  }, 0);

  if (data === undefined) {
    return <Skeleton className="mx-auto h-[50svh] w-full max-w-lg" />;
  }

  const productById = new Map(
    data.products.map((product) => [product.productId, product]),
  );

  const setLineUnit = (
    index: number,
    product: SaleFormProduct | undefined,
    unitId: string,
  ) => {
    form.setValue(`lines.${index}.unitId`, unitId);
    form.setValue(
      `lines.${index}.unitPriceNaira`,
      priceForUnit(product, unitId),
    );
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = productById.get(productId);
    form.setValue(`lines.${index}.productId`, productId);
    setLineUnit(index, product, product?.baseUnitId ?? "");
  };

  const handleUnitChange = (index: number, unitId: string) => {
    const product = productById.get(form.getValues(`lines.${index}.productId`));
    setLineUnit(index, product, unitId);
  };

  const handleSubmit = async (values: SaleFormValues) => {
    try {
      await recordSale({
        channel: values.channel,
        customerId: values.customerId || undefined,
        note: values.note?.trim() || undefined,
        lines: values.lines.map((line) => ({
          productId: line.productId,
          unitId: line.unitId,
          quantity: Number(line.quantity),
          unitPriceKobo: toKobo(line.unitPriceNaira),
        })),
      });
      toast.success("Sale recorded");
      router.push(SALES_PATH);
    } catch (error) {
      toast.error("Could not record sale", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="mx-auto w-full max-w-lg space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/admin/inventory">Inventory</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={SALES_PATH}>Sales</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Record sale</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="pt-12 pb-4">
          <h2 className="text-lg font-medium text-foreground">Record sale</h2>
          <p className="mt-1 w-[35ch] text-sm text-muted-foreground">
            What left the shop and what the customer paid. This takes the stock
            down and adds the money to revenue.
          </p>
        </div>
      </div>

      {data.products.length === 0 ? (
        <p className="mx-auto w-full max-w-lg text-sm text-muted-foreground">
          Add a product to the{" "}
          <Link href="/admin/inventory/products" className="underline">
            catalogue
          </Link>{" "}
          before recording a sale.
        </p>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="mx-auto w-full max-w-lg space-y-4">
              <FormField
                control={form.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="pos">POS</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Customer</FormLabel>
                    <CustomerCombobox
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Leave blank for a walk-in.
                      </p>
                      {customerId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => field.onChange("")}
                        >
                          Clear
                        </Button>
                      ) : null}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <hr className="mx-auto my-16 w-full max-w-lg border-t border-border" />

            <div className="mx-auto w-full max-w-4xl space-y-3">
              <div className="hidden gap-3 px-3 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[2rem_minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_7rem_2.5rem]">
                <span>S/N</span>
                <span>Product</span>
                <span>Qty / unit</span>
                <span>Price per unit</span>
                <span className="text-right">Total (NGN)</span>
                <span className="sr-only">Remove</span>
              </div>

              <div className="space-y-3 md:space-y-2">
                {fields.map((field, index) => {
                  const line = watchedLines?.[index];
                  return (
                    <SaleLineRow
                      key={field.id}
                      index={index}
                      control={form.control}
                      line={line}
                      product={productById.get(line?.productId ?? "")}
                      products={data.products}
                      canRemove={fields.length > 1}
                      onProductChange={handleProductChange}
                      onUnitChange={handleUnitChange}
                      onRemove={remove}
                    />
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    productId: "",
                    unitId: "",
                    quantity: "1",
                    unitPriceNaira: "",
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Add line
              </Button>
            </div>

            <hr className="mx-auto my-16 w-full max-w-lg border-t border-border" />

            <div className="mx-auto w-full max-w-lg space-y-4">
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Note</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g. Paid on transfer"
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
                <Button type="button" variant="outline" asChild>
                  <Link href={SALES_PATH}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : "Record sale"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
