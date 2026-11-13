"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMetrics } from "./metrics-context";
import { formatKobo } from "./metrics-format";

type MetricCardProps = {
  label: string;
  value: string;
  /** What the number measures, shown on demand behind an info icon. */
  info?: string;
  children?: ReactNode;
};

function MetricCard({ label, value, info, children }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-1 flex-col gap-2 p-6">
        <CardDescription className="flex items-center gap-1">
          {label}
          {info ? (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`About ${label}`}
                    className="cursor-default text-muted-foreground/60 hover:text-muted-foreground"
                  >
                    <Info className="size-3.5" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-56 text-xs">
                  {info}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </CardDescription>
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
      <MetricCard
        label="Booked"
        value={formatKobo(revenue.totalKobo)}
        info="The full value of the sales recorded in the range, whether or not the money has arrived."
      />

      <MetricCard
        label="Collected"
        value={formatKobo(revenue.collectedKobo)}
        info="Money that arrived in the range, no matter which sale it belongs to."
      />

      <MetricCard
        label="Owed"
        value={formatKobo(revenue.outstandingKobo)}
        info="The unpaid part of the sales recorded in the range. Booked, Collected and Owed measure different things, so they do not add up to each other."
      />

      <MetricCard
        label="Gross margin"
        value={formatKobo(margin.grossMarginKobo)}
        info="What the shop kept after paying for the stock that was sold. The lines below show it as a share of sales, and what the sold stock cost."
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

      <MetricCard
        label="Stock value"
        value={formatKobo(stock.valueKobo)}
        info="What you paid for everything you are yet to sell."
      >
        <span className="flex flex-wrap items-center gap-2">
          {stock.productCount} products
          {stock.lowCount > 0 ? (
            <Badge variant="secondary">{stock.lowCount} low</Badge>
          ) : null}
          {stock.outCount > 0 ? (
            <span className="text-destructive">{stock.outCount} out</span>
          ) : null}
        </span>
      </MetricCard>

      <MetricCard
        label="Purchase spend"
        value={formatKobo(spend.totalKobo)}
        info="Money spent buying new stock."
      />

      <MetricCard
        label="Total sales count"
        value={revenue.salesCount.toLocaleString()}
        info="How many receipts were recorded in the range."
      >
        <p>Receipts recorded</p>
      </MetricCard>
    </div>
  );
}
