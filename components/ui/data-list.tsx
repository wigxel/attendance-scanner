"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The key/value data table of a detail sheet — one <dl>, keys ~30%, values
 * ~70%, keys muted, values text-sm. Every scalar of the sheet (including
 * child-entity groups) belongs here; never a second data table below the
 * separator.
 */
function DataListRoot({
  className,
  children,
  ...restProps
}: HTMLAttributes<HTMLDListElement>) {
  return (
    <dl
      className={cn(
        "grid grid-cols-[0.3fr_0.7fr] items-baseline gap-x-6 gap-y-4 text-sm",
        className,
      )}
      {...restProps}
    >
      {children}
    </dl>
  );
}

type DataListItemProps = {
  label: string;
  /** Extra classes for the value, e.g. "tabular-nums" for money rows. */
  className?: string;
  children: ReactNode;
};

export function DataListItem({
  label,
  className,
  children,
}: DataListItemProps) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-foreground", className)}>{children}</dd>
    </>
  );
}

export const DataList = Object.assign(DataListRoot, { Item: DataListItem });
