"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InventoryMovementRow } from "@/convex/inventory";
import { useMetrics } from "./metrics-context";

function MovementTable({ rows }: { rows: InventoryMovementRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead className="text-right">Bought</TableHead>
          <TableHead className="text-right">Used</TableHead>
          <TableHead className="text-right">Used / bought</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-sm text-muted-foreground">
              No stock moved in this period.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.productId}>
              <TableCell>{row.name}</TableCell>
              <TableCell className="text-right tabular-nums">
                {row.purchased} {row.unitName}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.used} {row.unitName}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.sellThroughPercent === null
                  ? "—"
                  : `${row.sellThroughPercent}%`}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export function MetricsMovementSection() {
  const { metrics } = useMetrics();

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">
        Stock purchased vs used
      </h3>
      <div className="rounded-md border border-(--border) bg-(--background)">
        <MovementTable rows={metrics.movement} />
      </div>
      <p className="text-xs text-muted-foreground">
        Usage is what left the shelf, not what was sold. The terminal does not
        report line items.
      </p>
    </section>
  );
}
