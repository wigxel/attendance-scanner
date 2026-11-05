import type { Metadata } from "next";
import { StockContent } from "../_components/stock-content";

export const metadata: Metadata = {
  title: "Inventory · Stock",
};

export default function InventoryStockPage() {
  return <StockContent />;
}
