"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  type CreatedProduct,
  ProductFormDialog,
} from "@/components/inventory/product-form-dialog";
import { PurchaseLineRow } from "@/components/inventory/purchase-line-row";
import { SupplierFormDialog } from "@/components/inventory/supplier-form-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { ScrollFade } from "@/components/ui/scroll-fade";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { currencyFormatter } from "@/lib/currency.helpers";

const PURCHASES_PATH = "/admin/inventory/purchases";

function isBlankOrNonNegative(value: string) {
  return value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0);
}

function isPositive(value: string) {
  return !Number.isNaN(Number(value)) && Number(value) > 0;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
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
  unitCostNaira: z.string().trim().refine(isBlankOrNonNegative, {
    message: "Cost must be 0 or more",
  }),
});

const purchaseFormSchema = z
  .object({
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
  })
  .superRefine((values, ctx) => {
    const firstLine = new Map<string, number>();

    values.lines.forEach((line, index) => {
      if (!line.productId) return;

      const seenOn = firstLine.get(line.productId);
      if (seenOn !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lines", index, "productId"],
          message: `This product is already on line ${seenOn}`,
        });
        return;
      }

      firstLine.set(line.productId, index + 1);
    });
  });

export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

const purchaseFormDefaultState: PurchaseFormValues = {
  supplierId: "",
  occurredAt: todayInputValue(),
  amountPaidNaira: "",
  freightNaira: "",
  discountNaira: "",
  note: "",
  lines: [{ productId: "", unitId: "", quantity: "1", unitCostNaira: "" }],
};

export function PurchaseForm() {
  const router = useRouter();
  const createPurchase = useMutation(api.inventory.createPurchase);
  const data = useQuery(api.inventory.purchaseFormData, {});
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [productLineIndex, setProductLineIndex] = useState<number | null>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = async (values: PurchaseFormValues) => {
    try {
      await createPurchase({
        supplierId: values.supplierId || undefined,
        occurredAt: new Date(`${values.occurredAt}T00:00:00`).toISOString(),
        amountPaidKobo:
          values.amountPaidNaira === ""
            ? undefined
            : toKobo(values.amountPaidNaira),
        freightKobo:
          values.freightNaira === "" ? undefined : toKobo(values.freightNaira),
        discountKobo:
          values.discountNaira === ""
            ? undefined
            : toKobo(values.discountNaira),
        note: values.note?.trim() || undefined,
        lines: values.lines.map((line) => ({
          productId: line.productId,
          unitId: line.unitId,
          quantity: Number(line.quantity),
          unitCostKobo: toKobo(line.unitCostNaira),
        })),
      });
      toast.success("Purchase recorded");
      router.push(PURCHASES_PATH);
    } catch (error) {
      toast.error("Could not record purchase", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const header = (
    <div className="space-y-4 mx-auto w-full max-w-lg">
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
              <Link href={PURCHASES_PATH}>Purchases</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Record purchase</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="pt-12 pb-4">
        <h2 className="text-lg font-medium text-foreground">Record purchase</h2>
        <p className="mt-1 text-sm text-muted-foreground w-[35ch]">
          What you bought and at what cost. This restocks the products and moves
          their average cost.
        </p>
      </div>
    </div>
  );

  if (data === undefined) {
    return (
      <div className="space-y-6">
        {header}
        <Skeleton className="mx-auto h-[50svh] w-full max-w-lg" />
      </div>
    );
  }

  const productById = new Map(
    data.products.map((product) => [product.productId, product]),
  );

  // First line each product appears on, so repeats can be flagged.
  const lineByProduct = new Map<string, number>();
  (watchedLines ?? []).forEach((line, index) => {
    const productId = line?.productId;
    if (productId && !lineByProduct.has(productId)) {
      lineByProduct.set(productId, index + 1);
    }
  });

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

  const handleProductChange = (index: number, productId: string) => {
    form.setValue(`lines.${index}.productId`, productId);
    applyProductDefaults(index, productId);
  };

  const handleProductCreated = (product: CreatedProduct) => {
    const index = productLineIndex;
    setProductLineIndex(null);

    if (index === null) return;

    form.setValue(`lines.${index}.productId`, product.productId);
    form.setValue(`lines.${index}.unitId`, product.baseUnitId);
    form.setValue(
      `lines.${index}.unitCostNaira`,
      String(product.costPriceKobo / 100),
    );
  };

  return (
    <>
      <div className="space-y-6">
        {header}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="mx-auto w-full max-w-lg space-y-4">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Supplier</FormLabel>
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

            <hr className="mx-auto w-full max-w-lg border-t border-border my-16" />

            <div className="mx-auto w-full max-w-4xl space-y-3">
              <div className="relative overflow-hidden rounded-lg border">
                <Table className="min-w-xl" containerRef={tableScrollRef}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">S/N</TableHead>
                      <TableHead className="min-w-48">Product</TableHead>
                      <TableHead className="min-w-40">Qty / Unit</TableHead>
                      <TableHead className="min-w-32">Cost per unit</TableHead>
                      <TableHead className="min-w-[9.375rem] text-right">
                        Total (NGN)
                      </TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {fields.map((field, index) => {
                      const line = watchedLines?.[index];
                      const product = productById.get(line?.productId ?? "");

                      return (
                        <PurchaseLineRow
                          key={field.id}
                          index={index}
                          control={form.control}
                          line={line}
                          product={product}
                          products={data.products}
                          lineByProduct={lineByProduct}
                          canRemove={fields.length > 1}
                          onProductChange={handleProductChange}
                          onCreateProduct={setProductLineIndex}
                          onRemove={remove}
                        />
                      );
                    })}
                  </TableBody>
                </Table>
                <ScrollFade targetRef={tableScrollRef} />
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
                    unitCostNaira: "",
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Add line
              </Button>
            </div>

            <hr className="mx-auto w-full max-w-lg border-t border-border my-16" />

            <div className="mx-auto w-full max-w-lg space-y-4">
              <FormField
                control={form.control}
                name="amountPaidNaira"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount paid</FormLabel>
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
                    <FormLabel optional>Freight</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        {...field}
                        step={100}
                        placeholder="0.00"
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Transport or delivery cost paid to get this stock here.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discountNaira"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Discount</FormLabel>
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
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Note</FormLabel>
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
                <Button type="button" variant="outline" asChild>
                  <Link href={PURCHASES_PATH}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? "Saving..."
                    : "Record purchase"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>

      <SupplierFormDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        onCreated={(supplierId) => form.setValue("supplierId", supplierId)}
      />

      <ProductFormDialog
        open={productLineIndex !== null}
        onOpenChange={(open) => {
          if (!open) setProductLineIndex(null);
        }}
        onCreated={handleProductCreated}
      />
    </>
  );
}
