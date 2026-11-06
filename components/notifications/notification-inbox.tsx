"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { BellIcon, CheckCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  EmptyState,
  EmptyStateConceal,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

// Shape of one stored in-app row. The component API erases row types to any,
// so the reader declares what it renders.
type InboxItem = {
  _id: string;
  _creationTime: number;
  title: string;
  body: string;
  url?: string;
  readAt?: number;
};

type Inbox = { items: InboxItem[]; unread: number };

const MAX_BADGE = 9;

// Bell + inbox for the signed-in user's in-app notifications. Every queued
// notification also stores an in-app row (convex/notifications.ts), so this
// is the one place a person sees everything addressed to them.
export function NotificationInbox() {
  const { isSignedIn } = useUser();
  const inbox = useQuery(api.notifications.mine, isSignedIn ? {} : "skip") as
    | Inbox
    | null
    | undefined;
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!isSignedIn) return null;

  const unread = inbox?.unread ?? 0;
  const items = inbox?.items ?? [];

  const openNotification = (id: string, url?: string) => {
    markRead({ deliveryId: id });
    setOpen(false);
    if (url) router.push(url);
  };

  const renderList = () => {
    if (inbox === undefined) {
      return (
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      );
    }

    return (
      <EmptyState isEmpty={items.length === 0}>
        <EmptyStateContent className="px-4 py-8">
          <EmptyStateTitle>Nothing here yet</EmptyStateTitle>
          <EmptyStateDescription>
            Messages about your bookings and account will show up here.
          </EmptyStateDescription>
        </EmptyStateContent>

        <EmptyStateConceal>
          <ul>
            {items.map((item) => (
              <li key={item._id}>
                <button
                  type="button"
                  onClick={() => openNotification(item._id, item.url)}
                  className={cn(
                    "flex w-full flex-col gap-1 border-b px-4 py-3 text-left last:border-b-0 hover:bg-accent",
                    !item.readAt && "bg-accent/40",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {!item.readAt && (
                      <span className="size-2 shrink-0 rounded-full bg-primary" />
                    )}
                    {item.title}
                  </span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {item.body}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(item._creationTime, {
                      addSuffix: true,
                    })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </EmptyStateConceal>
      </EmptyState>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
          }
          className="relative"
        >
          <BellIcon />
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full px-1 text-[10px] leading-none"
            >
              {unread > MAX_BADGE ? `${MAX_BADGE}+` : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <PopoverHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
          <PopoverTitle className="text-sm">Notifications</PopoverTitle>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => markAllRead({})}
            >
              <CheckCheckIcon className="size-3" />
              Mark all read
            </Button>
          )}
        </PopoverHeader>

        <ScrollArea className="max-h-80">{renderList()}</ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
