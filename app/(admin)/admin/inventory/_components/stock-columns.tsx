"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { History, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "./row-actions";

export type StockRow = {
  productId: string;
  name: string;
  sku?: string;
  baseUnitName: string;
  baseUnitAbbreviation?: string;
  reorderLevel: number;
  quantity: number;
  status: "out" | "low" | "ok";
  lastMovementAt: string | null;
};

const statusLabels: Record<StockRow["status"], string> = {
  out: "Out",
  low: "Low",
  ok: "In stock",
};

const statusVariants: Record<
  StockRow["status"],
  "destructive" | "secondary" | "success"
> = {
  out: "destructive",
  low: "secondary",
  ok: "success",
};

export function createStockColumns(actions: {
  onRecordMovement: (row: StockRow) => void;
  onOpenHistory: (row: StockRow) => void;
}): ColumnDef<StockRow>[] {
  return [
    {
      id: "name",
      header: "Product",
      accessorKey: "name",
    },
    {
      id: "sku",
      header: "SKU",
      accessorKey: "sku",
      cell: ({ row }) => row.original.sku ?? "—",
    },
    {
      id: "in stock",
      header: "In stock",
      accessorKey: "quantity",
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {row.original.quantity} {row.original.baseUnitName}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => (
        <Badge variant={statusVariants[row.original.status]}>
          {statusLabels[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "last movement",
      header: "Last stock change",
      accessorKey: "lastMovementAt",
      cell: ({ row }) =>
        row.original.lastMovementAt
          ? new Date(row.original.lastMovementAt).toLocaleDateString()
          : "—",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const stock = row.original;
        return (
          <RowActions
            rowLabel={stock.name}
            actions={[
              {
                icon: <PlusCircle />,
                label: "Record change",
                onSelect: () => actions.onRecordMovement(stock),
              },
              {
                icon: <History />,
                label: "History",
                onSelect: () => actions.onOpenHistory(stock),
              },
            ]}
          />
        );
      },
    },
  ];
}
