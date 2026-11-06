import type { Metadata } from "next";
import { PurchasesContent } from "../_components/purchases-content";

export const metadata: Metadata = {
  title: "Inventory · Purchases",
};

export default function InventoryPurchasesPage() {
  return <PurchasesContent />;
}
