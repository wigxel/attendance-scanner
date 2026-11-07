import type { Metadata } from "next";
import { SalesContent } from "../_components/sales-content";

export const metadata: Metadata = {
  title: "Inventory · Sales",
};

export default function InventorySalesPage() {
  return <SalesContent />;
}
