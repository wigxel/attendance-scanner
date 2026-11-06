import type { Metadata } from "next";
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
  return <PurchaseDetailContent purchaseId={purchaseId} />;
}
