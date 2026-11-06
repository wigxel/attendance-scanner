"use client";

import { MetricsDateRange } from "@/components/inventory/metrics-date-range";
import { MetricsCards } from "./metrics-cards";
import { MetricsProvider, useMetrics } from "./metrics-context";
import { MetricsMovementSection } from "./metrics-movement-section";
import { MetricsRevenueSection } from "./metrics-revenue-section";
import { MetricsTopSalesSection } from "./metrics-top-sales-section";

function MetricsBody() {
  const { range, setRange } = useMetrics();

  return (
    <div className="space-y-6">
      <div className="mb-12">
        <h1 className="text-3xl font-bold">Metrics</h1>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <MetricsDateRange value={range} onChange={setRange} />
      </div>

      <MetricsCards />

      <MetricsTopSalesSection />

      <div className="grid gap-6 lg:grid-cols-2">
        <MetricsRevenueSection />
        <MetricsMovementSection />
      </div>
    </div>
  );
}

export function MetricsContent() {
  return (
    <MetricsProvider>
      <MetricsBody />
    </MetricsProvider>
  );
}
