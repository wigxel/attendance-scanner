"use client";

import { format, parseISO } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMetrics } from "./metrics-context";
import { formatAmount } from "./metrics-format";

export function MetricsTopSalesSection() {
  const { metrics } = useMetrics();

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Top sales days</h3>
      <div className="rounded-md border border-(--border) bg-(--background)">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead className="text-right">Total (NGN)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.topSales.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-sm text-muted-foreground"
                >
                  No sales recorded in this period.
                </TableCell>
              </TableRow>
            ) : (
              metrics.topSales.map((day) => (
                <TableRow key={day.date}>
                  <TableCell>
                    {format(parseISO(day.date), "EEE, MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAmount(day.totalKobo)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Highest recorded shop-sales days in this range. The terminal does not
        report line items, so products cannot be ranked.
      </p>
    </section>
  );
}
