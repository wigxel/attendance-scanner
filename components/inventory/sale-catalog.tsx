"use client";

import { Minus, Package, Plus } from "lucide-react";
import useEvent from "react-use-event-hook";
import { Button } from "@/components/ui/button";
import type { SaleFormProduct } from "@/convex/inventory";
import { type MutateFn, useQuantity } from "@/hooks/use-quantity";
import { currencyFormatter } from "@/lib/currency.helpers";
import { cn } from "@/lib/utils";
import { useSaleCart } from "./sale-cart-store";

function unitLabel(product: SaleFormProduct) {
  const unit = product.units.find(
    (option) => option.unitId === product.baseUnitId,
  );
  return unit?.abbreviation || unit?.name || "unit";
}

type SaleCatalogProps = {
  products: SaleFormProduct[];
};

export function SaleCatalog({ products }: SaleCatalogProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.productId} product={product} />
      ))}
    </div>
  );
}

type ProductCardProps = {
  product: SaleFormProduct;
};

function ProductCard({ product }: ProductCardProps) {
  const quantity = useSaleCart(
    (state) => state.quantities[product.productId] ?? 0,
  );
  const adjustQuantity = useSaleCart((state) => state.adjust);

  // The store read happens inside `adjust`, so a held button keeps stepping
  // from the latest quantity instead of the one captured on mouse down.
  const onAdjust = useEvent((mutate: MutateFn) =>
    adjustQuantity(product.productId, mutate),
  );
  const [decrement, increment] = useQuantity({ onAdjust });

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-background p-2",
        quantity > 0 && "border-primary/60 ring-1 ring-primary/20",
      )}
    >
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-muted">
        {/* Placeholder until products carry their own image. */}
        <Package className="size-7 text-muted-foreground/40" aria-hidden />
      </div>

      <div className="mt-2 min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {product.sellPriceKobo === undefined
            ? "No price set"
            : `${currencyFormatter.format(product.sellPriceKobo / 100)} / ${unitLabel(product)}`}
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between gap-1 rounded-lg border p-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={quantity === 0}
          aria-label={`Remove one ${product.name}`}
          {...decrement}
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="text-sm font-medium tabular-nums">{quantity}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={`Add one ${product.name}`}
          {...increment}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
