"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { useMetrics } from "./metrics-context";
import { formatKobo } from "./metrics-format";

type MetricCardProps = {
  label: string;
  value: string;
  children?: ReactNode;
};

function MetricCard({ label, value, children }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-1 flex-col gap-2 p-6">
        <CardDescription>{label}</CardDescription>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {children ? (
          <div className="text-muted-foreground mt-auto text-sm">
            {children}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function MetricsCards() {
  const { metrics } = useMetrics();
  const { stock, spend, revenue, margin } = metrics;

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard label="Stock value" value={formatKobo(stock.valueKobo)}>
        <span className="flex flex-wrap items-center gap-2">
          {stock.productCount} products
          {stock.lowCount > 0 ? (
            <Badge variant="secondary">{stock.lowCount} low</Badge>
          ) : null}
          {stock.outCount > 0 ? (
            <Badge variant="destructive">{stock.outCount} out</Badge>
          ) : null}
        </span>
      </MetricCard>

      <MetricCard label="Purchase spend" value={formatKobo(spend.totalKobo)} />

      <MetricCard label="Gross revenue" value={formatKobo(revenue.totalKobo)}>
        <p>Revenue from recorded shop sales</p>
      </MetricCard>

      <MetricCard
        label="Total sales count"
        value={revenue.salesCount.toLocaleString()}
      >
        <p>Daily channel totals recorded</p>
      </MetricCard>

      <MetricCard
        label="Gross margin"
        value={formatKobo(margin.grossMarginKobo)}
      >
        <div className="space-y-1">
          <p>
            {margin.grossMarginPercent === null
              ? "No revenue in this period"
              : `${margin.grossMarginPercent}% of revenue`}
          </p>
          <p>{formatKobo(margin.cogsKobo)} cost of stock used</p>
        </div>
      </MetricCard>
    </div>
  );
}
