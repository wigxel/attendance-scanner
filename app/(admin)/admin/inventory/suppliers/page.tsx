import type { Metadata } from "next";
import { RoleHas } from "@/components/RoleHas";
import { SuppliersContent } from "../_components/suppliers-content";

export const metadata: Metadata = {
  title: "Inventory · Suppliers",
};

export default function InventorySuppliersPage() {
  return (
    <RoleHas privileges={["inventory:manage"]}>
      <SuppliersContent />
    </RoleHas>
  );
}
