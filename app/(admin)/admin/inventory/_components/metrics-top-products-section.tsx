"use client";

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

export function MetricsTopProductsSection() {
  const { metrics } = useMetrics();

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Top sold products</h3>
      <div className="rounded-md border border-(--border) bg-(--background)">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Sold</TableHead>
              <TableHead className="text-right">Revenue (NGN)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.topProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-sm text-muted-foreground"
                >
                  No sales in this period.
                </TableCell>
              </TableRow>
            ) : (
              metrics.topProducts.map((product) => (
                <TableRow key={product.productId}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {product.quantity} {product.unitName}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAmount(product.revenueKobo)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
