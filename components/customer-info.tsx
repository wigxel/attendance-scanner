"use client";
import { api } from "@/convex/_generated/api";
import { useCustomer } from "@/hooks/auth";
import { cn } from "@/lib/utils";
import { format, isSameYear } from "date-fns";
import { Globe } from "lucide-react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { Area, AreaChart } from "recharts";
import React from "react";
import {
  EmptyState,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "./empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";

function CustomerSheet({
  userId,
  open,
  onOpenChange,
}: {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const customer = useCustomer({ userId: userId ?? "" });
  const {
    results: visits,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.customers.getVisitHistory,
    userId ? { userId } : "skip",
    { initialNumItems: 20 },
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col h-full overflow-y-auto"
      >
        <SheetHeader className="p-6 border-b">
          <SheetTitle>Customer Details</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1">
          {customer && (
            <div className="p-6 flex items-start gap-4">
              <CustomerAvatar
                userId={userId ?? ""}
                className="w-16 h-16 shrink-0"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {customer.firstName} {customer.lastName}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {customer.email}
                </p>
                <p className="text-muted-foreground text-sm">
                  {customer.phoneNumber}
                </p>
                <p className="text-muted-foreground text-sm">
                  {customer.occupation}
                </p>
              </div>
              {userId && <CustomerVisitTrend userId={userId} />}
            </div>
          )}
          <div className="p-6 pt-0 border-t">
            <h4 className="font-semibold mb-4 mt-4">Visit History</h4>

            {status === "LoadingFirstPage" ? (
              <p>Loading...</p>
            ) : visits.length === 0 ? (
              <EmptyState isEmpty>
                <EmptyStateContent className="py-6">
                  <Globe className="w-8 h-8 text-muted-foreground" />
                  <EmptyStateTitle>No visits yet</EmptyStateTitle>
                  <EmptyStateDescription>
                    This customer hasn&apos;t been scanned in yet.
                  </EmptyStateDescription>
                </EmptyStateContent>
              </EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {visits.map((visit) => {
                  const visitDate = new Date(visit.timestamp);
                  const isCurrentYear = isSameYear(visitDate, new Date());
                  const formattedDate = format(
                    visitDate,
                    isCurrentYear ? "do MMM" : "do MMM, yyyy",
                  );
                  const formattedTime = format(visitDate, "h:mm a");

                  return (
                    <li
                      key={visit._id}
                      className="py-3 flex justify-between items-center gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="tabular-nums font-mono text-sm text-muted-foreground">
                          {formattedTime}
                        </span>
                        <span className="text-sm">by {visit.adminName}</span>
                      </div>
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className="text-sm mr-2">{formattedDate}</span>
                        <PaymentBadge data={visit.access} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {status === "CanLoadMore" && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => loadMore(20)}
              >
                Load More
              </Button>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function CustomerVisitTrend({ userId }: { userId: string }) {
  const data = useQuery(api.customers.getCustomerVisitTrend, { userId });

  if (!data || data.length === 0) return null;

  return (
    <div className="h-16 w-32 shrink-0">
      <ChartContainer
        config={{ visits: { label: "Visits", color: "#3b82f6" } }}
      >
        <AreaChart
          data={data}
          margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <ChartTooltip
            content={<ChartTooltipContent hideLabel />}
            cursor={false}
          />
          <Area
            type="monotone"
            dataKey="visits"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorVisits)"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

function CustomerAvatar({
  userId,
  className = "w-8 h-8",
}: {
  userId: string;
  className?: string;
}) {
  const user = useCustomer({ userId }) ?? { firstName: "", lastName: "" };

  return (
    <Avatar className={className}>
      <AvatarImage
        src={"undefined"}
        alt="User Avatar"
        className="object-cover"
      />
      <AvatarFallback>
        {user.firstName.charAt(0)}
        {user.lastName.charAt(0)}
      </AvatarFallback>
    </Avatar>
  );
}

type AccessPlan =
  | { kind: "free" }
  | { kind: "paid"; amount: number }
  | undefined;

function PaymentBadge({ data }: { data: AccessPlan }) {
  const kind = data?.kind ?? "--";

  return (
    <span className={cn(map[kind as keyof typeof map], "capitalize")}>
      {kind}
    </span>
  );
}

const map = {
  paid: "text-[oklch(0.44_0.3_264.05)]",
  free: "text-foreground",
  "--": "destructive",
} as const;

export { CustomerSheet };
