"use client";

import { formatDistanceToNow } from "date-fns";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type InboxRow = {
  _id: string;
  title: string;
  body: string;
  url?: string;
  readAt?: number;
  createdAt: number;
};

type NotificationItemProps = {
  row: InboxRow;
  archived?: boolean;
  onOpen: (row: InboxRow) => void;
  onArchive: (row: InboxRow) => void;
  onRestore: (row: InboxRow) => void;
};

export function NotificationItemSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <li className={cn(`py-2 px-8`, className)}>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span
            className="size-1.5 -ml-3.5 shrink-0 rounded-full bg-muted-foreground/30"
            aria-hidden
          />
          <Skeleton className="h-4 w-2/5" />
        </div>
        <div className="w-4/5 flex flex-col gap-2">
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-4/5" />
        </div>
      </div>
    </li>
  );
}

export function NotificationItem({
  row,
  archived = false,
  onOpen,
  onArchive,
  onRestore,
}: NotificationItemProps) {
  const handleOpen = () => onOpen(row);
  const handleArchive = () => (archived ? onRestore(row) : onArchive(row));

  return (
    <li
      className={cn(
        "flex items-start gap-2 px-3 py-2",
        !row.readAt && "bg-primary/5",
      )}
    >
      <button
        type="button"
        className="min-w-0 flex-1 text-left pl-5"
        onClick={handleOpen}
      >
        <div className="flex items-center gap-2">
          {!row.readAt && (
            <span
              className="size-1.5 -ml-3.5 shrink-0 rounded-full bg-primary"
              aria-hidden
            />
          )}
          <p className="truncate text-sm font-medium">{row.title}</p>
        </div>
        <div>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {row.body}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatDistanceToNow(row.createdAt, { addSuffix: true })}
          </p>
        </div>
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        aria-label={`${archived ? "Restore" : "Archive"} ${row.title}`}
        onClick={handleArchive}
      >
        {archived ? (
          <ArchiveRestore className="size-3.5" />
        ) : (
          <Archive className="size-3.5" />
        )}
      </Button>
    </li>
  );
}
