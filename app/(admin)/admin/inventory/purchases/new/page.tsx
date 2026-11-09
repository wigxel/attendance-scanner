import type { Metadata } from "next";
import { PurchaseForm } from "@/components/inventory/purchase-form";
import { RoleHas } from "@/components/RoleHas";

export const metadata: Metadata = {
  title: "Inventory · Record purchase",
};

export default function NewPurchasePage() {
  return (
    <RoleHas privileges={["inventory:manage"]}>
      <PurchaseForm />
    </RoleHas>
  );
}
