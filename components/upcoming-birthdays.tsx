"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { format, parseISO } from "date-fns";
import { Cake } from "lucide-react";
import Link from "next/link";
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

type BirthdayRow = {
  profileId: string;
  name: string;
  daysAhead: number;
  nextDate: string;
};

type BirthdayRowProps = { row: BirthdayRow };

function UpcomingBirthdayRow({ row }: BirthdayRowProps) {
  const initials = row.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const badge =
    row.daysAhead === 0
      ? "Today"
      : `in ${row.daysAhead} day${row.daysAhead === 1 ? "" : "s"}`;

  return (
    <li className="flex items-center gap-2 text-sm">
      <Avatar className="h-6 w-6 shrink-0 select-none">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <Link href="/admin/customers" className="flex-1 truncate hover:underline">
        {row.name}
      </Link>
      <span className="shrink-0 text-xs text-muted-foreground">
        {format(parseISO(row.nextDate), "d MMM")}
      </span>
      <Badge variant="secondary" className="shrink-0">
        {badge}
      </Badge>
    </li>
  );
}

export function UpcomingBirthdays() {
  const { isAuthenticated } = useConvexAuth();
  const rows = useQuery(
    api.customers.listUpcomingBirthdays,
    isAuthenticated ? {} : "skip",
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cake className="h-4 w-4 text-muted-foreground" />
          Upcoming birthdays
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
              <EmptyStateTitle>No upcoming birthdays</EmptyStateTitle>
              <EmptyStateDescription>
                No member has a birthday in the next 30 days.
              </EmptyStateDescription>
            </EmptyStateContent>
            <EmptyStateConceal>
              <ul className="flex flex-col gap-2">
                {rows.map((row) => (
                  <UpcomingBirthdayRow key={row.profileId} row={row} />
                ))}
              </ul>
            </EmptyStateConceal>
          </EmptyState>
        )}
      </CardContent>
    </Card>
  );
}
