"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import {
  EmptyState,
  EmptyStateConceal,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { serialNo } from "@/lib/data.helpers";

const CADENCE_LABEL: Record<string, string> = {
  week: "Weekly",
  month: "Monthly",
};

type ExpiringRow = {
  bookingId: string;
  endDate: string;
  daysLeft: number;
  durationType: string;
  user: { name: string };
};

type ExpiringRowProps = { row: ExpiringRow; index: number };

function ExpiringSubscriptionRow({ row, index }: ExpiringRowProps) {
  const initials = row.user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="w-5 font-mono text-xs tabular-nums text-muted-foreground">
        {serialNo(index + 1)}
      </span>
      <Avatar className="h-6 w-6 shrink-0 select-none">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <span className="flex-1 truncate">{row.user.name}</span>
      <Badge variant="secondary" className="shrink-0">
        {CADENCE_LABEL[row.durationType] ?? row.durationType}
      </Badge>
      <span className="shrink-0 text-xs text-muted-foreground">
        {row.daysLeft === 0
          ? "Expires today"
          : format(new Date(row.endDate), "EEE d MMM")}
        {row.daysLeft > 0 && ` · ${row.daysLeft}d`}
      </span>
    </li>
  );
}

export function ExpiringSubscriptions() {
  const rows = useQuery(api.bookings.listExpiringSubscriptions, {});

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          Expiring soon
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows === undefined ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </div>
        ) : (
          <EmptyState isEmpty={rows.length === 0}>
            <EmptyStateContent>
              <EmptyStateTitle>No expiring subscriptions</EmptyStateTitle>
              <EmptyStateDescription>
                Nothing expires within 7 days.
              </EmptyStateDescription>
            </EmptyStateContent>
            <EmptyStateConceal>
              <ul className="flex flex-col gap-2">
                {rows.map((row, i) => (
                  <ExpiringSubscriptionRow
                    key={row.bookingId}
                    row={row}
                    index={i}
                  />
                ))}
              </ul>
            </EmptyStateConceal>
          </EmptyState>
        )}
      </CardContent>
    </Card>
  );
}
