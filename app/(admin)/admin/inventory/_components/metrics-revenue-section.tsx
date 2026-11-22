"use client";

import {
  BanknoteIcon,
  CreditCardIcon,
  GiftIcon,
  HandCoinsIcon,
  LandmarkIcon,
  type LucideIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  InventoryMetrics,
  RevenueChannelShare,
  SaleChannel,
} from "@/convex/inventory";
import { formatKobo } from "@/lib/currency.helpers";
import { useMetrics } from "./metrics-context";

/** Free never appears in byChannel; it reports under "Given away". */
type MoneyChannel = Exclude<SaleChannel, "free">;

const channelLabels: Record<MoneyChannel, string> = {
  cash: "Cash",
  pos: "POS",
  transfer: "Transfer",
  credit: "Credit",
};

const channelStyles: Record<
  MoneyChannel,
  { Icon: LucideIcon; className: string }
> = {
  cash: { Icon: BanknoteIcon, className: "text-green-700 dark:text-green-400" },
  pos: { Icon: CreditCardIcon, className: "text-blue-700 dark:text-blue-400" },
  transfer: {
    Icon: LandmarkIcon,
    className: "text-violet-700 dark:text-violet-400",
  },
  credit: {
    Icon: HandCoinsIcon,
    className: "text-amber-700 dark:text-amber-400",
  },
};

type RevenueTableProps = {
  shares: RevenueChannelShare[];
  givenAway: InventoryMetrics["revenue"]["givenAway"];
};

function RevenueTable({ shares, givenAway }: RevenueTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Channel</TableHead>
          <TableHead className="text-right">Revenue (NGN)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shares.map((share) => {
          const { Icon, className } = channelStyles[share.channel];
          return (
            <TableRow key={share.channel}>
              <TableCell>
                <span className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                  <span className={className}>
                    {channelLabels[share.channel]}
                  </span>
                </span>
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatKobo(share.totalKobo)}
              </TableCell>
            </TableRow>
          );
        })}
        {givenAway.count > 0 ? (
          <TableRow>
            <TableCell>
              <span className="flex items-center gap-2">
                <GiftIcon
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
                <span>Given away</span>
              </span>
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {formatKobo(givenAway.valueKobo)}
              <span className="block text-xs font-normal text-muted-foreground">
                {givenAway.count} sale{givenAway.count === 1 ? "" : "s"}
              </span>
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </Table>
  );
}

export function MetricsRevenueSection() {
  const { metrics } = useMetrics();

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">
        Revenue by channel
      </h3>
      <div className="rounded-md border border-border bg-background">
        <RevenueTable
          shares={metrics.revenue.byChannel}
          givenAway={metrics.revenue.givenAway}
        />
      </div>
    </section>
  );
}
