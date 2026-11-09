import type { Metadata } from "next";
import { RoleHas } from "@/components/RoleHas";
import { PurchaseDetailContent } from "../../_components/purchase-detail-content";

export const metadata: Metadata = {
  title: "Inventory · Purchase",
};

export default async function InventoryPurchasePage({
  params,
}: {
  params: Promise<{ purchaseId: string }>;
}) {
  const { purchaseId } = await params;
  return (
    <RoleHas privileges={["inventory:manage"]}>
      <PurchaseDetailContent purchaseId={purchaseId} />
    </RoleHas>
  );
}
