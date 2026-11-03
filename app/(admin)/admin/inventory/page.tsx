import type { Metadata } from "next";
import { InventoryManager } from "@/components/inventory/inventory-manager";

export const metadata: Metadata = {
  title: "Inventory",
};

export default function InventoryPage() {
  return (
    <div className="flex w-full flex-col gap-8 p-6 md:p-8">
      <header>
        <h1 className="text-3xl font-bold">Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track what you keep in stock, and record every purchase, restock and
          usage entry against it.
        </p>
      </header>

      <InventoryManager />
    </div>
  );
}
