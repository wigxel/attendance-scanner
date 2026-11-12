"use client";

import {
  BanknoteIcon,
  CreditCardIcon,
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
import type { RevenueChannelShare, SaleChannel } from "@/convex/inventory";
import { useMetrics } from "./metrics-context";
import { formatAmount, formatKobo } from "./metrics-format";

const channelLabels: Record<SaleChannel, string> = {
  cash: "Cash",
  pos: "POS",
  transfer: "Transfer",
  credit: "Credit",
};

const channelStyles: Record<
  SaleChannel,
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

function RevenueTable({ shares }: { shares: RevenueChannelShare[] }) {
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
                {formatAmount(share.totalKobo)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function RevenueStrip() {
  const { metrics } = useMetrics();
  const { revenue } = metrics;
  const figures = [
    { label: "Booked", valueKobo: revenue.totalKobo },
    { label: "Collected (all sales)", valueKobo: revenue.collectedKobo },
    {
      label: "Owed on this period's sales",
      valueKobo: revenue.outstandingKobo,
    },
  ];

  return (
    <div className="space-y-2">
      <dl className="grid gap-2 sm:grid-cols-3">
        {figures.map((figure) => (
          <div
            key={figure.label}
            className="rounded-md border border-(--border) bg-(--background) p-4"
          >
            <dt className="text-muted-foreground text-sm">{figure.label}</dt>
            <dd className="font-semibold text-foreground">
              {formatKobo(figure.valueKobo)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground text-sm">
        Booked is the sales recorded in this range, Collected is the money that
        arrived in it whatever sale it belongs to, and Owed is the unpaid part
        of this range&apos;s sales. They measure different things, so they do
        not add up to each other.
      </p>
    </div>
  );
}

export function MetricsRevenueSection() {
  const { metrics } = useMetrics();

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">
        Revenue by channel
      </h3>
      <RevenueStrip />
      <div className="rounded-md border border-(--border) bg-(--background)">
        <RevenueTable shares={metrics.revenue.byChannel} />
      </div>
    </section>
  );
}
