"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { MetricsDateRange } from "@/components/inventory/metrics-date-range";
import { Button } from "@/components/ui/button";
import { MetricsCards } from "./metrics-cards";
import { MetricsProvider, useMetrics } from "./metrics-context";
import { MetricsMovementSection } from "./metrics-movement-section";
import { MetricsRevenueSection } from "./metrics-revenue-section";
import { MetricsTopProductsSection } from "./metrics-top-products-section";

function MetricsBody() {
  const { range, setRange } = useMetrics();

  return (
    <div className="space-y-6">
      <div className="mb-12">
        <h1 className="text-3xl font-bold">Metrics</h1>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <MetricsDateRange value={range} onChange={setRange} />
        <Button asChild>
          <Link href="/admin/inventory/sales/new">
            <Plus className="h-4 w-4" />
            Record sale
          </Link>
        </Button>
      </div>

      <MetricsCards />

      <MetricsTopProductsSection />

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
