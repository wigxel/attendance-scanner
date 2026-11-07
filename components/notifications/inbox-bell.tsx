"use client";

import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Archive, BellIcon, Inbox, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  EmptyState,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

type InboxRow = {
  _id: string;
  title: string;
  body: string;
  url?: string;
  readAt?: number;
  createdAt: number;
};

export function InboxBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const rows = useQuery(api.notifications.inbox, { archived: showArchived });
  const unread = useQuery(api.notifications.unreadCount) ?? 0;

  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const archive = useMutation(api.notifications.archive);
  const unarchive = useMutation(api.notifications.unarchive);

  const openRow = async (row: InboxRow) => {
    await markRead({ id: row._id });
    if (row.url) router.push(row.url);
  };

  const archiveRow = (row: InboxRow) => archive({ id: row._id });
  const restoreRow = (row: InboxRow) => unarchive({ id: row._id });
  const toggleArchived = () => setShowArchived((archived) => !archived);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
          }
        >
          <BellIcon className="size-5" />
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full px-1 text-[10px]"
            >
              {unread > 99 ? "99+" : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-medium">
            {showArchived ? "Archived" : "Notifications"}
          </p>
        </div>

        <ScrollArea className="h-[22rem]">
          {rows === undefined && (
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {rows?.length === 0 && (
            <EmptyState isEmpty>
              <EmptyStateContent className="px-4 py-12">
                <Inbox className="size-6 text-muted-foreground" />
                <EmptyStateTitle>
                  {showArchived ? "Nothing archived" : "You are all caught up"}
                </EmptyStateTitle>
                <EmptyStateDescription>
                  {showArchived
                    ? "Archived notifications show up here."
                    : "New notifications will appear here."}
                </EmptyStateDescription>
              </EmptyStateContent>
            </EmptyState>
          )}

          {rows && rows.length > 0 && (
            <ul className="divide-y">
              {rows.map((row) => (
                <li
                  key={row._id}
                  className={cn(
                    "flex items-start gap-2 px-3 py-2",
                    !row.readAt && "bg-primary/5",
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => openRow(row)}
                  >
                    <div className="flex items-center gap-2">
                      {!row.readAt && (
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-primary"
                          aria-hidden
                        />
                      )}
                      <p className="truncate text-sm font-medium">
                        {row.title}
                      </p>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {row.body}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatDistanceToNow(row.createdAt, { addSuffix: true })}
                    </p>
                  </button>

                  {showArchived ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label={`Restore ${row.title}`}
                      onClick={() => restoreRow(row)}
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label={`Archive ${row.title}`}
                      onClick={() => archiveRow(row)}
                    >
                      <Archive className="size-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between border-t px-2 py-2">
          {unread > 0 && !showArchived ? (
            <Button variant="ghost" size="sm" onClick={() => markAllRead({})}>
              Mark all read
            </Button>
          ) : (
            <span />
          )}
          <Button variant="ghost" size="sm" onClick={toggleArchived}>
            {showArchived ? "Back to inbox" : "Show archived"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
