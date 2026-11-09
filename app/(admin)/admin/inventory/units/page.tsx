import type { Metadata } from "next";
import { RoleHas } from "@/components/RoleHas";
import { UnitsContent } from "../_components/units-content";

export const metadata: Metadata = {
  title: "Inventory · Units",
};

export default function InventoryUnitsPage() {
  return (
    <RoleHas privileges={["inventory:manage"]}>
      <UnitsContent />
    </RoleHas>
  );
}
