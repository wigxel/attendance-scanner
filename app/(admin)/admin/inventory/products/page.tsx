import type { Metadata } from "next";
import { ProductsContent } from "../_components/products-content";

export const metadata: Metadata = {
  title: "Inventory · Catalogue",
};

export default function InventoryProductsPage() {
  return <ProductsContent />;
}
