"use client";

import { useQuery } from "convex/react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { RevenueFormDialog } from "@/components/inventory/revenue-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type {
  InventoryMovementRow,
  RevenueChannel,
  RevenueChannelShare,
} from "@/convex/inventory";
import { currencyFormatter } from "@/lib/currency.helpers";

const channelLabels: Record<RevenueChannel, string> = {
  cash: "Cash",
  pos: "POS",
  transfer: "Transfer",
  unrecorded: "Unrecorded",
};

function formatKobo(value: number) {
  return currencyFormatter.format(value / 100);
}

type MetricCardProps = {
  label: string;
  value: string;
  children?: ReactNode;
};

function MetricCard({ label, value, children }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="space-y-2 p-6">
        <CardDescription>{label}</CardDescription>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {children ? (
          <div className="text-sm text-muted-foreground">{children}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

type RevenueTableProps = { shares: RevenueChannelShare[] };

function RevenueTable({ shares }: RevenueTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Channel</TableHead>
          <TableHead className="text-right">Bookings</TableHead>
          <TableHead className="text-right">Shop sales</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shares.map((share) => (
          <TableRow key={share.channel}>
            <TableCell>{channelLabels[share.channel]}</TableCell>
            <TableCell className="text-right">
              {formatKobo(share.bookingKobo)}
            </TableCell>
            <TableCell className="text-right">
              {formatKobo(share.shopKobo)}
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatKobo(share.totalKobo)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

type MovementTableProps = { rows: InventoryMovementRow[] };

function MovementTable({ rows }: MovementTableProps) {
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
              <TableCell className="text-right">
                {row.purchased} {row.unitName}
              </TableCell>
              <TableCell className="text-right">
                {row.used} {row.unitName}
              </TableCell>
              <TableCell className="text-right">
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

export function MetricsContent() {
  const [start, setStart] = useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [end, setEnd] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [isRevenueOpen, setIsRevenueOpen] = useState(false);

  const metrics = useQuery(api.inventory.metrics, { start, end });

  const changeStart = (value: string) => {
    if (!value) return;
    setStart(value);
    if (value > end) setEnd(value);
  };

  const changeEnd = (value: string) => {
    if (!value) return;
    setEnd(value);
    if (value < start) setStart(value);
  };

  const showThisMonth = () => {
    setStart(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    setEnd(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  };

  if (metrics === undefined) {
    return <Skeleton className="h-[60svh] w-full" />;
  }

  const { stock, spend, revenue, margin, movement } = metrics;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Metrics</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Totals only. The POS reports day totals, so there is no per-product
            revenue or margin here.
          </p>
        </div>

        <Button variant="outline" onClick={() => setIsRevenueOpen(true)}>
          <Plus className="h-4 w-4" />
          Record shop sales
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="metrics-start">From</Label>
          <Input
            id="metrics-start"
            type="date"
            value={start}
            max={end}
            onChange={(event) => changeStart(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="metrics-end">To</Label>
          <Input
            id="metrics-end"
            type="date"
            value={end}
            min={start}
            onChange={(event) => changeEnd(event.target.value)}
          />
        </div>
        <Button variant="ghost" onClick={showThisMonth}>
          This month
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

        <MetricCard label="Purchase spend" value={formatKobo(spend.totalKobo)}>
          <div className="space-y-1">
            <p>{formatKobo(spend.paidKobo)} paid</p>
            <p>{formatKobo(spend.outstandingKobo)} outstanding</p>
            <p>
              {spend.purchaseCount} purchase
              {spend.purchaseCount === 1 ? "" : "s"}
            </p>
          </div>
        </MetricCard>

        <MetricCard label="Gross revenue" value={formatKobo(revenue.totalKobo)}>
          <div className="space-y-1">
            <p>{formatKobo(revenue.bookingKobo)} bookings</p>
            <p>{formatKobo(revenue.shopKobo)} shop sales</p>
          </div>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">
            Revenue by channel
          </h3>
          <div className="rounded-md border border-(--border)">
            <RevenueTable shares={revenue.byChannel} />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">
            Stock purchased vs used
          </h3>
          <div className="rounded-md border border-(--border)">
            <MovementTable rows={movement} />
          </div>
          <p className="text-xs text-muted-foreground">
            Usage is what left the shelf, not what was sold. The terminal does
            not report line items.
          </p>
        </section>
      </div>

      <RevenueFormDialog open={isRevenueOpen} onOpenChange={setIsRevenueOpen} />
    </div>
  );
}
