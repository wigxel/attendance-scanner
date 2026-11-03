"use client";

import { useMutation, useQuery } from "convex/react";
import { PackagePlus, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  EmptyState,
  EmptyStateConceal,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import {
  InventoryItemForm,
  type InventoryItemFormValues,
} from "@/components/forms/InventoryItemForm";
import {
  StockMovementForm,
  type StockMovementFormValues,
} from "@/components/forms/StockMovementForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { Doc } from "@/convex/_generated/dataModel";
import { getErrorMessage } from "@/lib/error.helpers";

type InventoryItem = Doc<"inventoryItems">;

const SKELETON_IDS = Array.from({ length: 4 }, () => crypto.randomUUID());

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function isLowStock(item: InventoryItem) {
  return item.quantity <= item.reorderLevel;
}

type ItemProps = { item: InventoryItem };

function StockStatus({ item }: ItemProps) {
  if (item.quantity === 0) return <Badge variant="destructive">Out</Badge>;
  if (isLowStock(item)) return <Badge variant="secondary">Low</Badge>;
  return <Badge variant="outline">In stock</Badge>;
}

type RowProps = ItemProps & {
  onStock: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
};

function InventoryRow({ item, onStock, onEdit }: RowProps) {
  const stock = (
    <span className="font-mono tabular-nums">
      {item.quantity} {item.unit}
    </span>
  );

  return (
    <TableRow>
      <TableCell>
        <span className="font-medium">{item.name}</span>
        {item.sku && (
          <span className="block font-mono text-xs text-muted-foreground">
            {item.sku}
          </span>
        )}
      </TableCell>
      <TableCell>{stock}</TableCell>
      <TableCell className="text-muted-foreground">
        {item.reorderLevel}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {naira.format(item.costPrice)}
      </TableCell>
      <TableCell>
        <StockStatus item={item} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => onStock(item)}>
            <PackagePlus className="size-4" />
            Stock
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onEdit(item)}>
            <Pencil className="size-4" />
            <span className="sr-only">Edit {item.name}</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function InventoryManager() {
  const items = useQuery(api.inventory.listItems);

  const createItem = useMutation(api.inventory.createItem);
  const updateItem = useMutation(api.inventory.updateItem);
  const recordMovement = useMutation(api.inventory.recordMovement);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [stocking, setStocking] = useState<InventoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totals = useMemo(() => {
    const list = items ?? [];
    return {
      tracked: list.length,
      low: list.filter(isLowStock).length,
      value: list.reduce((sum, i) => sum + i.quantity * i.costPrice, 0),
    };
  }, [items]);

  const handleAdd = async (values: InventoryItemFormValues) => {
    setIsSubmitting(true);
    try {
      await createItem({
        name: values.name,
        sku: values.sku || undefined,
        unit: values.unit,
        quantity: values.quantity,
        reorderLevel: values.reorderLevel,
        costPrice: values.costPrice,
      });
      toast.success(`${values.name.trim()} added to inventory`);
      setAddOpen(false);
    } catch (error) {
      toast.error("Could not add item", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (values: InventoryItemFormValues) => {
    if (!editing) return;
    setIsSubmitting(true);
    try {
      await updateItem({
        itemId: editing._id,
        name: values.name,
        unit: values.unit,
        reorderLevel: values.reorderLevel,
        costPrice: values.costPrice,
      });
      toast.success(`${values.name.trim()} updated`);
      setEditing(null);
    } catch (error) {
      toast.error("Could not update item", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStock = async (values: StockMovementFormValues) => {
    if (!stocking) return;
    setIsSubmitting(true);
    try {
      const { quantity } = await recordMovement({
        itemId: stocking._id,
        kind: values.kind,
        quantity: values.quantity,
        unitCost: values.kind === "purchase" ? values.unitCost : undefined,
        note: values.note || undefined,
      });
      toast.success(`${stocking.name}: ${quantity} ${stocking.unit} in stock`);
      setStocking(null);
    } catch (error) {
      toast.error("Could not record entry", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeEditor = () => setEditing(null);
  const closeStockDialog = () => setStocking(null);

  if (items === undefined) {
    return (
      <div className="flex flex-col gap-4">
        {SKELETON_IDS.map((id) => (
          <Skeleton key={id} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <dl className="flex flex-wrap gap-8 text-sm">
          <div>
            <dt className="text-muted-foreground">Items tracked</dt>
            <dd className="font-heading text-2xl font-semibold tabular-nums">
              {totals.tracked}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Low or out of stock</dt>
            <dd className="font-heading text-2xl font-semibold tabular-nums">
              {totals.low}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Stock value</dt>
            <dd className="font-heading text-2xl font-semibold tabular-nums">
              {naira.format(totals.value)}
            </dd>
          </div>
        </dl>

        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add item
        </Button>
      </div>

      <EmptyState isEmpty={items.length === 0}>
        <EmptyStateContent>
          <EmptyStateTitle>No stock items yet</EmptyStateTitle>
          <EmptyStateDescription>
            Add the drinks, snacks or supplies you count, then record purchases
            and usage against them.
          </EmptyStateDescription>
        </EmptyStateContent>
        <EmptyStateConceal>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>In stock</TableHead>
                  <TableHead>Low-stock level</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <InventoryRow
                    key={item._id}
                    item={item}
                    onStock={setStocking}
                    onEdit={setEditing}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </EmptyStateConceal>
      </EmptyState>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add stock item</DialogTitle>
            <DialogDescription>
              Count the items you keep, so usage and purchases have something to
              land on.
            </DialogDescription>
          </DialogHeader>
          <InventoryItemForm
            isLoading={isSubmitting}
            onSubmit={handleAdd}
            onCancel={() => setAddOpen(false)}
            submitLabel="Add item"
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && closeEditor()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editing?.name}</DialogTitle>
            <DialogDescription>
              Stock count changes are recorded as entries, not here.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <InventoryItemForm
              initialFormData={{
                name: editing.name,
                sku: editing.sku,
                unit: editing.unit,
                quantity: editing.quantity,
                reorderLevel: editing.reorderLevel,
                costPrice: editing.costPrice,
              }}
              isLoading={isSubmitting}
              onSubmit={handleEdit}
              onCancel={closeEditor}
              submitLabel="Save changes"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={stocking !== null}
        onOpenChange={(open) => !open && closeStockDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record entry for {stocking?.name}</DialogTitle>
            <DialogDescription>
              {stocking &&
                `${stocking.quantity} ${stocking.unit} in stock right now.`}
            </DialogDescription>
          </DialogHeader>
          {stocking && (
            <StockMovementForm
              itemName={stocking.name}
              isLoading={isSubmitting}
              onSubmit={handleStock}
              onCancel={closeStockDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
