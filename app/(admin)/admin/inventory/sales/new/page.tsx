import type { Metadata } from "next";
import { SaleForm } from "@/components/inventory/sale-form";

export const metadata: Metadata = {
  title: "Inventory · Record sale",
};

export default function NewSalePage() {
  return <SaleForm />;
}
