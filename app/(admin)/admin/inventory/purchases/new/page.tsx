import type { Metadata } from "next";
import { PurchaseForm } from "@/components/inventory/purchase-form";

export const metadata: Metadata = {
  title: "Inventory · Record purchase",
};

export default function NewPurchasePage() {
  return <PurchaseForm />;
}
