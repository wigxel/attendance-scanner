import type { Metadata } from "next";
import { RoleHas } from "@/components/RoleHas";
import { PurchasesContent } from "../_components/purchases-content";

export const metadata: Metadata = {
  title: "Inventory · Purchases",
};

export default function InventoryPurchasesPage() {
  return (
    <RoleHas privileges={["inventory:manage"]}>
      <PurchasesContent />
    </RoleHas>
  );
}
