"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { CustomerCombobox } from "@/components/forms/CustomerCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { usePrivilege } from "@/hooks/usePrivilege";
import { currencyFormatter } from "@/lib/currency.helpers";

const channelLabels = {
  cash: "Cash",
  pos: "POS",
  transfer: "Transfer",
} as const;

function formatKobo(value: number) {
  return currencyFormatter.format(value / 100);
}

type SaleDetailSheetProps = {
  saleId: string | null;
  onOpenChange: (open: boolean) => void;
};

export function SaleDetailSheet({
  saleId,
  onOpenChange,
}: SaleDetailSheetProps) {
  const detail = useQuery(
    api.inventory.saleDetail,
    saleId ? { saleId } : "skip",
  );
  const voidSale = useMutation(api.inventory.voidSale);
  const setSaleCustomer = useMutation(api.inventory.setSaleCustomer);
  const { valid: canManage } = usePrivilege("inventory:manage");

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");

  const handleVoid = async () => {
    if (!saleId) return;
    const ok = window.confirm(
      "Void this sale? The stock goes back and the money leaves revenue.",
    );
    if (!ok) return;

    try {
      await voidSale({ saleId });
      toast.success("Sale voided");
    } catch (error) {
      toast.error("Could not void sale", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const openCustomerDialog = () => {
    setCustomerId(detail?.sale.customerId ?? "");
    setCustomerDialogOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!saleId) return;

    try {
      await setSaleCustomer({ saleId, customerId: customerId || undefined });
      setCustomerDialogOpen(false);
      toast.success("Customer updated");
    } catch (error) {
      toast.error("Could not change customer", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <>
      <Sheet open={saleId !== null} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {detail === undefined ? (
            <Skeleton className="mt-8 h-[50svh] w-full" />
          ) : detail === null ? (
            <SheetHeader>
              <SheetTitle>Sale not found</SheetTitle>
              <SheetDescription>
                It may have been removed from the list.
              </SheetDescription>
            </SheetHeader>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>
                  {formatKobo(detail.sale.totalKobo)} ·{" "}
                  {channelLabels[detail.sale.channel]}
                </SheetTitle>
                <SheetDescription>
                  {new Date(detail.sale.occurredAt).toLocaleString("en-NG")} ·
                  recorded by {detail.createdByName}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-4 pb-8">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="text-sm text-foreground">
                      {detail.customerName ?? "Walk-in"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {detail.sale.voided ? (
                      <Badge variant="secondary">Voided</Badge>
                    ) : null}
                    {canManage ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={openCustomerDialog}
                      >
                        Change customer
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.lines.map((line) => (
                        <TableRow key={line._id}>
                          <TableCell>{line.productName}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {line.quantity} {line.unitName}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatKobo(line.lineTotalKobo)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {detail.sale.note ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Note</p>
                    <p className="text-sm text-foreground">
                      {detail.sale.note}
                    </p>
                  </div>
                ) : null}

                {canManage && !detail.sale.voided ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleVoid}
                  >
                    Void sale
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change customer</DialogTitle>
            <DialogDescription>
              Leave the field blank for a walk-in. The total and stock stay as
              they are.
            </DialogDescription>
          </DialogHeader>

          <CustomerCombobox value={customerId} onChange={setCustomerId} />

          {customerId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-self-start"
              onClick={() => setCustomerId("")}
            >
              Clear customer
            </Button>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomerDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveCustomer}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
