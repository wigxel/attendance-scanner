"use client";

import { useMutation, useQuery } from "convex/react";
import { BellIcon, Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useMediaQuery } from "usehooks-ts";
import { Drawer } from "vaul";
import {
  EmptyState,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { getErrorMessage } from "@/lib/error.helpers";
import { cn } from "@/lib/utils";
import {
  type InboxRow,
  NotificationItem,
  NotificationItemSkeleton,
} from "./notification-item";

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
  const sendTest = useMutation(api.notifications.sendTest);
  const isDev = process.env.NODE_ENV !== "production";
  const isMobile = useMediaQuery(
    "(max-width: 768px) and (orientation: portrait)",
    { defaultValue: false },
  );

  const openRow = async (row: InboxRow) => {
    await markRead({ id: row._id });
    if (row.url) router.push(row.url);
  };

  const archiveRow = (row: InboxRow) => archive({ id: row._id });
  const restoreRow = (row: InboxRow) => unarchive({ id: row._id });
  const activeTab = showArchived ? "archived" : "inbox";
  const selectTab = (value: string) => setShowArchived(value === "archived");

  const sendTestNotification = async () => {
    try {
      await sendTest({});
      toast.success("Test notification sent");
    } catch (error) {
      toast.error("Could not send the test notification", {
        description: getErrorMessage(error),
      });
    }
  };

  const hasUnread = unread > 0;

  const bellButton = (
    <Button
      variant="ghost"
      size="icon"
      className="relative border border-border gap-0 px-2 w-auto"
      aria-label={
        unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
      }
    >
      <BellIcon
        className={cn(
          "size-4 shrink-0 transition-default",
          hasUnread ? "me-4" : "",
        )}
      />
      {hasUnread && (
        <span
          className={cn(
            "transition-default absolute bg-red-500 size-2 self-center shrink-0 rounded-full opacity-0 translate-x-[400%]",
            "translate-x-2 opacity-100",
          )}
        />
      )}
    </Button>
  );

  const panel = (
    <>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <p className="text-sm font-medium">Notifications</p>
        <Tabs value={activeTab} onValueChange={selectTab}>
          <TabsList>
            <TabsTrigger value="inbox" className="text-xs">
              Inbox
            </TabsTrigger>
            <TabsTrigger value="archived" className="text-xs">
              Archive
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="h-88 pt-1">
        {rows === undefined && (
          <ul className="divide-y">
            <NotificationItemSkeleton className="opacity-60" />
            <NotificationItemSkeleton className="opacity-45" />
            <NotificationItemSkeleton className="opacity-30" />
            <NotificationItemSkeleton className="opacity-20" />
            <NotificationItemSkeleton className="opacity-10" />
          </ul>
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
              <NotificationItem
                key={row._id}
                row={row}
                archived={showArchived}
                onOpen={openRow}
                onArchive={archiveRow}
                onRestore={restoreRow}
              />
            ))}
          </ul>
        )}
      </ScrollArea>

      {(isDev || (unread > 0 && !showArchived)) && (
        <div className="flex items-center justify-between gap-2 border-t px-2 py-2">
          {unread > 0 && !showArchived ? (
            <Button variant="ghost" size="sm" onClick={() => markAllRead({})}>
              Mark all read
            </Button>
          ) : (
            <span />
          )}
          {isDev && (
            <Button variant="ghost" size="sm" onClick={sendTestNotification}>
              Test notification
            </Button>
          )}
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Trigger asChild>{bellButton}</Drawer.Trigger>

        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 rounded-t-[10px] bg-background outline-none border-border">
            <div className="w-full">
              <Drawer.Title className="sr-only">Notifications</Drawer.Title>
              {panel}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{bellButton}</PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        {panel}
      </PopoverContent>
    </Popover>
  );
}
