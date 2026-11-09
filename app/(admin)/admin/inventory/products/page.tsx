import type { Metadata } from "next";
import { RoleHas } from "@/components/RoleHas";
import { ProductsContent } from "../_components/products-content";

export const metadata: Metadata = {
  title: "Inventory · Catalogue",
};

export default function InventoryProductsPage() {
  return (
    <RoleHas privileges={["inventory:manage"]}>
      <ProductsContent />
    </RoleHas>
  );
}
