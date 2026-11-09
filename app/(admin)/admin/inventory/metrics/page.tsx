import type { Metadata } from "next";
import { RoleHas } from "@/components/RoleHas";
import { MetricsContent } from "../_components/metrics-content";

export const metadata: Metadata = {
  title: "Inventory · Metrics",
};

export default function InventoryMetricsPage() {
  return (
    <RoleHas privileges={["inventory:manage"]}>
      <MetricsContent />
    </RoleHas>
  );
}
