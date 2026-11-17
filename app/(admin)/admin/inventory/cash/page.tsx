import type { Metadata } from "next";
import { CashContent } from "../_components/cash-content";

export const metadata: Metadata = {
  title: "Inventory · Cash",
};

export default function InventoryCashPage() {
  return <CashContent />;
}
