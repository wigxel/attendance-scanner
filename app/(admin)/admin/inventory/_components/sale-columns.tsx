"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SaleStatus, SaleSummary } from "@/convex/inventory";
import { serialNo } from "@/lib/data.helpers";

const amountFormatter = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 2,
});

function formatAmount(kobo: number) {
  return amountFormatter.format(kobo / 100);
}

const channelLabels = {
  cash: "Cash",
  pos: "POS",
  transfer: "Transfer",
  credit: "Credit",
} as const;

type SaleStatusChip = {
  label: string;
  variant: "success" | "warning" | "destructive" | "outline" | "secondary";
};

const statusChips: Record<SaleStatus, SaleStatusChip> = {
  paid: { label: "Paid", variant: "success" },
  part_paid: { label: "Part-paid", variant: "warning" },
  unpaid: { label: "Unpaid", variant: "destructive" },
  written_off: { label: "Written off", variant: "outline" },
  voided: { label: "Voided", variant: "secondary" },
};

export type SaleStatusBadgeProps = { status: SaleStatus };

export function SaleStatusBadge({ status }: SaleStatusBadgeProps) {
  const chip = statusChips[status];

  return <Badge variant={chip.variant}>{chip.label}</Badge>;
}

export type SaleTotalCellProps = { sale: SaleSummary };

export function SaleTotalCell({ sale }: SaleTotalCellProps) {
  return (
    <span className="block whitespace-nowrap text-right tabular-nums">
      {formatAmount(sale.totalKobo)}
      {sale.outstandingKobo > 0 ? (
        <span className="block text-xs font-normal text-muted-foreground">
          {formatAmount(sale.outstandingKobo)} due
        </span>
      ) : null}
    </span>
  );
}

export const saleColumns: ColumnDef<SaleSummary>[] = [
  {
    id: "occurredAt",
    header: "Date",
    accessorKey: "occurredAt",
    cell: ({ row }) =>
      new Date(row.original.occurredAt).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
  },
  {
    id: "customer",
    header: "Customer",
    accessorFn: (sale) => sale.customerName ?? "Walk-in",
    cell: ({ row }) => row.original.customerName ?? "Walk-in",
  },
  {
    id: "items",
    header: "Items",
    // Product names and the note are search text, not a stored column.
    accessorFn: (sale) =>
      `${sale.items.map((item) => item.name).join(", ")} ${sale.note ?? ""}`.trim(),
    cell: ({ row }) => {
      const { lineCount, items } = row.original;
      const productNames = items.map((item) => item.name).join(", ");

      return (
        <span className="flex max-w-64 items-center gap-1">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default underline decoration-dotted underline-offset-4">
                  {lineCount} item{lineCount === 1 ? "" : "s"}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <ul className="tabular-nums">
                  {items.map((item) => (
                    <li key={item.id}>
                      {serialNo(item.quantity)} x {item.name}
                    </li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {items.length > 0 ? (
            <span className="truncate">· {productNames}</span>
          ) : null}
        </span>
      );
    },
  },
  {
    id: "channel",
    header: "Channel",
    accessorKey: "channel",
    cell: ({ row }) => channelLabels[row.original.channel],
  },
  {
    id: "totalKobo",
    header: () => <span className="block text-right">Total (₦)</span>,
    accessorKey: "totalKobo",
    cell: ({ row }) => <SaleTotalCell sale={row.original} />,
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => <SaleStatusBadge status={row.original.status} />,
  },
];
