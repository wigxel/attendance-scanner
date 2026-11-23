"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ConfirmActionProps = {
  title: string;
  description: string;
  /** Confirm button label; defaults to "Confirm". */
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  /** The control that opens the dialog. Omit when open is driven by state. */
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** A destructive-action confirm: app AlertDialog, busy state, no window.confirm. */
export function ConfirmAction({
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  children,
  open,
  onOpenChange,
}: ConfirmActionProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  const content = (
    <AlertDialogContent>
      <AlertDialogHeader className="gap-4">
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription className="text-pretty font-thin">
          {description}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter className="*:flex-1">
        <AlertDialogCancel disabled={isConfirming}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          onClick={handleConfirm}
          disabled={isConfirming}
        >
          {isConfirming ? `${confirmLabel}...` : confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );

  return children ? (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      {content}
    </AlertDialog>
  ) : (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {content}
    </AlertDialog>
  );
}

type ConfirmDefaults<Item> = {
  title: string | ((item: Item) => string);
  description: string | ((item: Item) => string);
  confirmLabel?: string;
};

type ConfirmActionForProps<Item> = {
  /** The row the confirm is about; null renders nothing. */
  item: Item | null;
  onConfirm: (item: Item) => void | Promise<void>;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Preconfigured ConfirmAction for one kind of destructive act: the columns
 * and pages pass the row item, the texts come from the factory. The item
 * doubles as the open switch — pass null to render nothing.
 */
export function createConfirmAction<Item>(defaults: ConfirmDefaults<Item>) {
  return function ConfirmActionFor({
    item,
    onConfirm,
    children,
    open,
    onOpenChange,
  }: ConfirmActionForProps<Item>) {
    if (item === null) return null;

    const title =
      typeof defaults.title === "function"
        ? defaults.title(item)
        : defaults.title;
    const description =
      typeof defaults.description === "function"
        ? defaults.description(item)
        : defaults.description;

    return (
      <ConfirmAction
        title={title}
        description={description}
        confirmLabel={defaults.confirmLabel}
        onConfirm={() => onConfirm(item)}
        open={open}
        onOpenChange={onOpenChange}
      >
        {children}
      </ConfirmAction>
    );
  };
}
