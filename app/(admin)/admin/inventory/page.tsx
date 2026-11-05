import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Inventory",
};

export default function InventoryPage() {
  redirect("/admin/inventory/products");
}
