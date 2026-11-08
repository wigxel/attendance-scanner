import type { Metadata } from "next";
import { SuppliersContent } from "../_components/suppliers-content";

export const metadata: Metadata = {
  title: "Inventory · Suppliers",
};

export default function InventorySuppliersPage() {
  return <SuppliersContent />;
}
