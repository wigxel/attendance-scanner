import type { Metadata } from "next";
import { MetricsContent } from "../_components/metrics-content";

export const metadata: Metadata = {
  title: "Inventory · Metrics",
};

export default function InventoryMetricsPage() {
  return <MetricsContent />;
}
