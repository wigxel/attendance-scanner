import type { Metadata } from "next";
import { UnitsContent } from "../_components/units-content";

export const metadata: Metadata = {
  title: "Inventory · Units",
};

export default function InventoryUnitsPage() {
  return <UnitsContent />;
}
