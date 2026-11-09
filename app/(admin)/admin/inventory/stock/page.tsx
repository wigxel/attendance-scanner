import type { Metadata } from "next";
import { RoleHas } from "@/components/RoleHas";
import { StockContent } from "../_components/stock-content";

export const metadata: Metadata = {
  title: "Inventory · Stock",
};

export default function InventoryStockPage() {
  return (
    <RoleHas privileges={["inventory:manage"]}>
      <StockContent />
    </RoleHas>
  );
}
