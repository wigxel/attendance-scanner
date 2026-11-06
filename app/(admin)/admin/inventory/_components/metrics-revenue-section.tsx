"use client";

import {
  BanknoteIcon,
  CircleHelpIcon,
  CreditCardIcon,
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
import type { RevenueChannel, RevenueChannelShare } from "@/convex/inventory";
import { useMetrics } from "./metrics-context";
import { formatAmount } from "./metrics-format";

const channelLabels: Record<RevenueChannel, string> = {
  cash: "Cash",
  pos: "POS",
  transfer: "Transfer",
  unrecorded: "Unrecorded",
};

const channelStyles: Record<
  RevenueChannel,
  { Icon: LucideIcon; className: string }
> = {
  cash: { Icon: BanknoteIcon, className: "text-green-700 dark:text-green-400" },
  pos: { Icon: CreditCardIcon, className: "text-blue-700 dark:text-blue-400" },
  transfer: {
    Icon: LandmarkIcon,
    className: "text-violet-700 dark:text-violet-400",
  },
  unrecorded: {
    Icon: CircleHelpIcon,
    className: "text-gray-500 dark:text-gray-400",
  },
};

function RevenueTable({ shares }: { shares: RevenueChannelShare[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Channel</TableHead>
          <TableHead className="text-right">Shop sales (NGN)</TableHead>
          <TableHead className="text-right">Total (NGN)</TableHead>
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
              <TableCell className="text-right tabular-nums">
                {formatAmount(share.shopKobo)}
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

export function MetricsRevenueSection() {
  const { metrics } = useMetrics();

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">
        Revenue by channel
      </h3>
      <div className="rounded-md border border-(--border) bg-(--background)">
        <RevenueTable shares={metrics.revenue.byChannel} />
      </div>
    </section>
  );
}
