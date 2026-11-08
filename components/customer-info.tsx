"use client";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { format, isSameYear } from "date-fns";
import {
  CircleHelp,
  Globe,
  type LucideIcon,
  Mail,
  Pencil,
  Phone,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { Area, AreaChart } from "recharts";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { CheckInMode } from "@/convex/shared";
import { useCustomer } from "@/hooks/auth";
import { getErrorMessage } from "@/lib/error.helpers";
import { formatPhone, isValidPhone, normalizePhone } from "@/lib/phone.helpers";
import { cn } from "@/lib/utils";
import { CheckInModeSelect } from "./check-in-mode-select";
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
import { Skeleton } from "./ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

type CustomerSheetProps = {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type CustomerDetail = {
  label: string;
  value?: string;
  href?: string;
  icon?: LucideIcon;
  warning?: string;
};

function CustomerSheet({ userId, open, onOpenChange }: CustomerSheetProps) {
  const customer = useCustomer({ userId: userId ?? "" });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateProfile = useMutation(api.customers.updateProfile);
  const setCheckInMode = useMutation(api.customers.setCheckInMode);

  const {
    results: visits,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.customers.getVisitHistory,
    userId ? { userId } : "skip",
    {
      initialNumItems: 20,
    },
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

  const handleModeChange = async (mode: CheckInMode | "auto") => {
    if (!userId) return;

    try {
      await setCheckInMode({ userId, mode });
      toast.success("Check-in mode updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const phone = customer?.phoneNumber?.trim();
  const normalizedPhone = phone ? normalizePhone(phone) : null;
  const phoneIsValid = phone ? isValidPhone(phone) : false;
  const formattedPhone = phone ? formatPhone(phone) : undefined;

  const details: CustomerDetail[] = customer
    ? [
      { label: "First name:", value: customer.firstName },
      { label: "Last name:", value: customer.lastName },
      {
        label: "Email:",
        value: customer.email,
        href: customer.email ? `mailto:${customer.email}` : undefined,
        icon: Mail,
      },
      {
        label: "Phone:",
        value: formattedPhone,
        href:
          phoneIsValid && normalizedPhone
            ? `tel:${normalizedPhone}`
            : undefined,
        icon: Phone,
        warning:
          phone && !phoneIsValid
            ? "This phone number does not look valid."
            : undefined,
      },
      { label: "Occupation:", value: customer.occupation },
    ]
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col h-full overflow-y-auto"
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
                className="w-12 h-12 shrink-0"
              />

              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {customer.firstName} {customer.lastName}
                </h3>
                {userId && <CustomerRegistration userId={userId} />}
              </div>

              {userId && <CustomerVisitTrend userId={userId} />}
            </div>
          ) : null}

          <div className="p-6 border-t flex flex-col md:flex-row gap-4 md:items-center">
            <div className="flex flex-1 items-center gap-1.5">
              <h4 className="font-semibold">Check-in mode</h4>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground">
                      <CircleHelp className="h-3.5 w-3.5" />
                      <span className="sr-only">About check-in mode</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-62.5">
                    Auto uses the app-wide default. Staff can always check
                    anyone in from the attendance page.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="basis-5/12">
              {customer ? (
                <CheckInModeSelect
                  value={customer.checkInMode ?? "auto"}
                  onChange={handleModeChange}
                  allowAuto
                  className="w-full"
                />
              ) : null}
            </div>
          </div>

          <div className="p-6 border-t">
            <h4 className="font-semibold mb-4">Personal details</h4>

            <dl className="space-y-2 text-sm">
              {details.map((detail) => {
                const Icon = detail.icon;

                return (
                  <div key={detail.label} className="flex gap-2">
                    <dt className="basis-4/12 shrink-0 text-muted-foreground">
                      {detail.label}
                    </dt>
                    <dd className="basis-6/12 min-w-0 break-words">
                      {detail.href ? (
                        <a
                          href={detail.href}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {Icon ? (
                            <Icon
                              size="1em"
                              className="text-muted-foreground mr-1.5 inline-block"
                            />
                          ) : null}
                          {detail.value}
                        </a>
                      ) : (
                        detail.value || "—"
                      )}

                      {detail.warning ? (
                        <span
                          title={detail.warning}
                          className="text-destructive ml-1.5 inline-flex align-[-0.125em]"
                        >
                          <TriangleAlert size="1em" aria-hidden />
                          <span className="sr-only">{detail.warning}</span>
                        </span>
                      ) : null}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

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

function CustomerRegistration({ userId }: { userId: string }) {
  const registeredAt = useQuery(api.customers.getRegistration, { userId });

  if (registeredAt === undefined) return <Skeleton className="h-4 w-44" />;
  if (registeredAt === null) return null;

  return (
    <span className="text-sm">
      <span className="text-muted-foreground">Joined:&nbsp;</span>

      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger className="hover:underline text-foreground tabular-nums cursor-help">
            {format(registeredAt, "MMM dd, yyyy")}
          </TooltipTrigger>
          <TooltipContent>
            {format(registeredAt, "MMM dd, yyyy")} •{" "}
            {format(registeredAt, "h:mm a")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
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
