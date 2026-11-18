import type { Metadata } from "next";
import { RoleHas } from "@/components/RoleHas";
import { ReceivablesContent } from "../_components/receivables-content";

export const metadata: Metadata = {
  title: "Inventory · Receivables",
};

export default function InventoryReceivablesPage() {
  return (
    <RoleHas privileges={["inventory:sell", "inventory:manage"]} require="any">
      <ReceivablesContent />
    </RoleHas>
  );
}
