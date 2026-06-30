"use client";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { format, isSameYear } from "date-fns";
import { Globe, Pencil } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart } from "recharts";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCustomer } from "@/hooks/auth";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "./empty-state";
import { CustomerEditForm } from "./forms/CustomerEditForm";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { ScrollArea } from "./ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";

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
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateProfile = useMutation(api.customers.updateProfile);

  const {
    results: visits,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.customers.getVisitHistory,
    userId ? { userId } : "skip",
    { initialNumItems: 20 },
  );

  const handleSave = async (data: {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    email?: string;
    occupation: string;
  }) => {
    if (!userId) return;
    setIsSubmitting(true);
    try {
      await updateProfile({
        userId,
        ...data,
        occupation: data.occupation as Id<"occupations"> | "None",
      });
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col h-full overflow-y-auto"
      >
        <SheetHeader className="p-6 border-b flex flex-row items-center justify-between">
          <SheetTitle>Customer Details</SheetTitle>
          {customer && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </SheetHeader>
        <ScrollArea className="flex-1">
          {customer && isEditing ? (
            <div className="p-6">
              <CustomerEditForm
                initialData={{
                  firstName: customer.firstName,
                  lastName: customer.lastName,
                  phoneNumber: customer.phoneNumber,
                  email: customer.email,
                  occupationId: customer.occupationId,
                }}
                onSubmit={handleSave}
                onCancel={() => setIsEditing(false)}
                isLoading={isSubmitting}
              />
            </div>
          ) : customer ? (
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
          ) : null}

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
                    isCurrentYear ? "MMM dd" : "MMM dd yyy",
                  );
                  const formattedTime = format(visitDate, "h:mm a");

                  return (
                    <li
                      key={visit._id}
                      className="py-3 flex justify-between items-start gap-2 text-sm"
                    >
                      <div className="flex items-start gap-2">
                        <Globe className="w-4 h-4 mt-[0.4ex] text-muted-foreground shrink-0" />
                        <div className="flex flex-col gap-0.5">
                          <span className="tabular-nums font-mono uppercase">
                            {formattedDate} • {formattedTime}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            by {visit.adminName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 tabular-nums">
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

type AccessPlan = { kind: "free" } | { kind: "paid" } | undefined;

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
