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

export function ProductCard({ product }: ProductCardProps) {
  const quantity = useSaleCart(
    (state) => state.quantities[product.productId] ?? 0,
  );
  const adjustQuantity = useSaleCart((state) => state.adjust);

  // The store read happens inside `adjust`, so a held button keeps stepping
  // from the latest quantity instead of the one captured on mouse down.
  const onAdjust = useEvent((mutate: MutateFn) =>
    adjustQuantity(product.productId, mutate),
  );

  return (
    <ProductCardView
      product={product}
      quantity={quantity}
      onAdjust={onAdjust}
    />
  );
}

type ProductCardViewProps = {
  product: SaleFormProduct;
  quantity: number;
  onAdjust: (mutate: MutateFn) => void;
};

export function ProductCardView({
  product,
  quantity,
  onAdjust,
}: ProductCardViewProps) {
  const [decrement, increment] = useQuantity({ onAdjust });

  // `stockQty` arrives only once the backend serves the current sale payload.
  // Treat a missing count as unknown, never as zero.
  const stockKnown = typeof product.stockQty === "number";
  const outOfStock = stockKnown && product.stockQty <= 0;
  const overStock = stockKnown && quantity > product.stockQty;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-background p-2",
        quantity > 0 && "border-cyan-400",
        outOfStock && "opacity-60",
      )}
    >
      <div className="flex aspect-4/3 items-center justify-center rounded-lg bg-muted">
        {/* Placeholder until products carry their own image. */}
        <Package
          className={cn(
            "size-7 text-muted-foreground",
            outOfStock && "grayscale",
          )}
          aria-hidden
        />
      </div>

      <div className="mt-2 min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {product.sellPriceKobo === undefined
            ? "No price set"
            : `${currencyFormatter.format(product.sellPriceKobo / 100)} / ${unitLabel(product)}`}
        </p>
        <p
          className={cn(
            "text-xs tabular-nums",
            outOfStock ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {stockKnown
            ? outOfStock
              ? "Out of stock"
              : `${product.stockQty} left`
            : null}
        </p>
      </div>

      <div
        className={cn(
          "mt-2 flex items-center justify-between gap-1 rounded-lg border p-0.5",
          overStock && "border-destructive ring-1 ring-destructive/30",
        )}
      >
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
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            overStock && "text-destructive",
          )}
        >
          {quantity}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={outOfStock}
          aria-label={`Add one ${product.name}`}
          {...increment}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
