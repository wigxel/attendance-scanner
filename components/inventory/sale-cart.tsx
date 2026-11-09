"use client";

import { useMutation } from "convex/react";
import { ShoppingCart, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CustomerCombobox } from "@/components/forms/CustomerCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { api } from "@/convex/_generated/api";
import type { SaleFormProduct } from "@/convex/inventory";
import { currencyFormatter } from "@/lib/currency.helpers";
import { getErrorMessage } from "@/lib/error.helpers";
import { cn } from "@/lib/utils";
import { useSaleCart } from "./sale-cart-store";

const SALES_PATH = "/admin/inventory/sales";

type SaleChannel = "cash" | "pos" | "transfer";

const CHANNELS: { value: SaleChannel; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "pos", label: "POS" },
  { value: "transfer", label: "Transfer" },
];

type SaleCartProps = {
  products: SaleFormProduct[];
};

type SaleLine = {
  product: SaleFormProduct;
  quantity: number;
  unitPriceKobo: number;
};

function pickSaleLines(
  products: SaleFormProduct[],
  quantities: Record<string, number>,
): SaleLine[] {
  return products.flatMap((product) => {
    const quantity = quantities[product.productId] ?? 0;
    if (quantity === 0) return [];
    return [{ product, quantity, unitPriceKobo: product.sellPriceKobo ?? 0 }];
  });
}

function saleNote(itemCount: number) {
  return `Counter sale · ${itemCount} item${itemCount === 1 ? "" : "s"}`;
}

export function SaleCart({ products }: SaleCartProps) {
  const router = useRouter();
  const recordSale = useMutation(api.inventory.recordSale);
  const quantities = useSaleCart((state) => state.quantities);
  const remove = useSaleCart((state) => state.remove);
  const clear = useSaleCart((state) => state.clear);

  const [channel, setChannel] = useState<SaleChannel>("cash");
  const [customerId, setCustomerId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const lines = pickSaleLines(products, quantities);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalKobo = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPriceKobo,
    0,
  );
  const hasOverStock = lines.some(
    (line) => line.quantity > line.product.stockQty,
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lines.length === 0) return;

    const saleLines = lines.map((line) => ({
      productId: line.product.productId,
      unitId: line.product.baseUnitId,
      quantity: line.quantity,
      unitPriceKobo: line.unitPriceKobo,
    }));

    setSubmitting(true);
    try {
      await recordSale({
        channel,
        customerId: customerId || undefined,
        note: saleNote(itemCount),
        lines: saleLines,
      });
      clear();
      toast.success("Sale recorded");
      router.push(SALES_PATH);
    } catch (error) {
      toast.error("Could not record sale", {
        description: getErrorMessage(error),
      });
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full w-full flex-col rounded-xl border bg-background"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Cart</p>
        </div>
        <Badge variant="secondary">{itemCount}</Badge>
      </div>

      {lines.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          Pick a product to start a sale.
        </p>
      ) : (
        <ul className="max-h-[60svh] divide-y overflow-y-auto">
          {lines.map(({ product, quantity, unitPriceKobo }) => (
            <li
              key={product.productId}
              className="flex items-center gap-2 px-4 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{product.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {quantity} × {currencyFormatter.format(unitPriceKobo / 100)}
                </p>
                {quantity > product.stockQty ? (
                  <p className="text-xs text-destructive">
                    Only {product.stockQty} left
                  </p>
                ) : null}
              </div>
              <p className="whitespace-nowrap text-sm tabular-nums">
                {currencyFormatter.format((quantity * unitPriceKobo) / 100)}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={() => remove(product.productId)}
                aria-label={`Remove ${product.name}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto space-y-5 border-t px-4 py-5">
        <div className="space-y-1.5">
          <Label>Channel</Label>
          <RadioGroup
            value={channel}
            onValueChange={(value) => setChannel(value as SaleChannel)}
            aria-label="Channel"
            className="grid-cols-3 gap-2"
          >
            {CHANNELS.map((option) => (
              <Label
                key={option.value}
                htmlFor={`sale-channel-${option.value}`}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm font-normal transition-colors",
                  channel === option.value
                    ? "border-primary bg-accent"
                    : "border-border",
                )}
              >
                <RadioGroupItem
                  id={`sale-channel-${option.value}`}
                  value={option.value}
                />
                {option.label}
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label>Customer</Label>
            {customerId ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setCustomerId("")}
              >
                Clear
              </Button>
            ) : null}
          </div>
          <CustomerCombobox
            value={customerId}
            onChange={setCustomerId}
            showEmail={false}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank for a walk-in.
          </p>
        </div>

        <div className="mt-1 flex items-baseline justify-between border-t pt-5">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-base font-semibold tabular-nums">
            {currencyFormatter.format(totalKobo / 100)}
          </span>
        </div>

        {hasOverStock ? (
          <p className="text-xs text-destructive">
            Reduce the items marked red — there is not enough stock.
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={lines.length === 0 || submitting || hasOverStock}
        >
          {submitting ? "Saving..." : "Record sale"}
        </Button>
      </div>
    </form>
  );
}
