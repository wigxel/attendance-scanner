"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { History, PlusCircle } from "lucide-react";
import { AppTableActions } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
          <AppTableActions>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => actions.onRecordMovement(stock)}
            >
              <PlusCircle className="h-4 w-4" />
              Record change
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`History for ${stock.name}`}
              onClick={() => actions.onOpenHistory(stock)}
            >
              <History className="h-4 w-4" />
            </Button>
          </AppTableActions>
        );
      },
    },
  ];
}
