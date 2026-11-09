// @vitest-environment node

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SaleFormProduct } from "@/convex/inventory";
import { ProductCardView } from "./sale-catalog";

const product: SaleFormProduct = {
  productId: "p1",
  name: "Peak Milk",
  sku: "MILK-1",
  sellPriceKobo: 40000,
  baseUnitId: "u1",
  stockQty: 5,
  units: [{ unitId: "u1", name: "pack", abbreviation: "pk", factorToBase: 1 }],
};

function render(item: SaleFormProduct, quantity = 0) {
  return renderToStaticMarkup(
    <ProductCardView product={item} quantity={quantity} onAdjust={() => {}} />,
  );
}

function buttonTag(html: string, label: string) {
  return html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0];
}

describe("ProductCard", () => {
  it("shows how many are left", () => {
    const html = render(product);

    expect(html).toContain("5 left");
    expect(html).not.toContain("undefined");
  });

  it("greys out and locks a product with no stock", () => {
    const html = render({ ...product, stockQty: 0 });

    expect(html).toContain("Out of stock");
    expect(html).toContain("opacity-60");
    expect(buttonTag(html, "Add one Peak Milk")).toMatch(/\sdisabled=""/);
  });

  it("allows picking while stock remains", () => {
    const html = render(product, 1);

    expect(buttonTag(html, "Add one Peak Milk")).not.toMatch(/\sdisabled=""/);
    expect(html).not.toContain("border-destructive ring-1");
  });

  it("flags a quantity above stock", () => {
    const html = render(product, 6);

    expect(html).toContain("border-destructive ring-1 ring-destructive/30");
    expect(html).toContain("text-destructive");
  });

  it("treats a missing stock count as unknown, not zero", () => {
    const legacy = {
      ...product,
      stockQty: undefined,
    } as unknown as SaleFormProduct;

    const html = render(legacy);

    expect(html).not.toContain("undefined");
    expect(html).not.toContain("Out of stock");
    expect(html).not.toContain("left");
    expect(buttonTag(html, "Add one Peak Milk")).not.toMatch(/\sdisabled=""/);
  });
});
