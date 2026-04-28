"use client";
import { DataTableDemo } from "@/components/DataTable";
import { columns } from "@/components/columns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { useCustomer } from "@/hooks/auth";
import { safeArray, safeNum, serialNo } from "@/lib/data.helpers";
import { DateParse } from "@/lib/date.helpers";
import { O } from "@/lib/fp.helpers";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  formatISO,
  isToday,
  parseISO,
  setHours,
} from "date-fns";
import { Option, pipe } from "effect";
import { ChevronLeft, ChevronRight, Crown, Gift } from "lucide-react";
import { motion } from "motion/react";
import * as React from "react";
import useEvent from "react-use-event-hook";
import { DateRange } from "./DateRange";
import { CustomerSheet } from "./customer-info";
import {
  EmptyState,
  EmptyStateConceal,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "./empty-state";
import { If } from "./if";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Skeleton } from "./ui/skeleton";

export function useUsers() {
  const record = useQuery(api.myFunctions.getAllUsers);

  return { data: safeArray(record) };
}

/*
  @todo: Add Visit History
  @todo:
*/
export function CustomersTable() {
  const { data: users } = useUsers();
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(
    null,
  );

  if (!users) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <DataTableDemo
        columns={columns}
        data={users.map((user) => ({
          ...user,
          firstname: user.firstName,
          lastname: user.lastName,
        }))}
        onRowClick={(row) => setSelectedUserId(row.userId)}
      />
      <CustomerSheet
        userId={selectedUserId}
        open={!!selectedUserId}
        onOpenChange={(open) => !open && setSelectedUserId(null)}
      />
    </div>
  );
}

function useAttendanceRegister() {
  const today = React.useMemo(() => {
    const today = new Date();
    const start = formatISO(setHours(today, 0));
    const end = formatISO(setHours(today, 23));

    return { start, end };
  }, []);

  const [current, setCurrent] = React.useState(() => today);

  const createDateRange = useEvent((date: Date) => ({
    start: formatISO(setHours(date, 0)),
    end: formatISO(setHours(date, 23)),
  }));

  const adjustDate = React.useCallback(
    (days: number) => {
      setCurrent((prev) => {
        const newDate = new Date(parseISO(prev.start));
        newDate.setDate(newDate.getDate() + days);
        return createDateRange(newDate);
      });
    },
    [createDateRange],
  );

  const incrementBy = React.useCallback(
    (days: number) => adjustDate(days),
    [adjustDate],
  );
  const decrementBy = React.useCallback(
    (days: number) => adjustDate(-days),
    [adjustDate],
  );

  return {
    isToday: isToday(current.start),
    current: current,
    incrementBy,
    decrementBy,
  };
}

export function TodaysCustomers() {
  const attendanceHandler = useAttendanceRegister();

  const records = safeArray(
    useQuery(api.myFunctions.getDailyRegister, {
      ...attendanceHandler.current,
    }),
  );

  return (
    <Card className="min-h-[32rem]">
      <CardHeader className="flex flex-row items-center space-y-0">
        <CardTitle className="flex-1">
          <span>
            <If cond={attendanceHandler.isToday}>Today&apos;s Scan</If>

            <If cond={!attendanceHandler.isToday}>
              {DateParse.presets
                .dateOnly(attendanceHandler.current.start)
                .pipe(O.getOrElse(() => "--"))}
            </If>
          </span>
          <span className="section-record-count">
            &nbsp;— {serialNo(records.length)}
          </span>
        </CardTitle>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => attendanceHandler.decrementBy(1)}
            className="h-8 w-8 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => attendanceHandler.incrementBy(1)}
            className="h-8 w-8 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <EmptyState isEmpty={records.length === 0}>
        <EmptyStateContent className="px-4">
          <EmptyStateTitle className="text-start w-full">
            No scans yet
          </EmptyStateTitle>
          <EmptyStateDescription className="text-start w-full">
            You&apos;ll see all scanned <br /> customers for today here
          </EmptyStateDescription>
        </EmptyStateContent>

        <EmptyStateConceal>
          <CardContent className="p-0">
            <ScrollArea>
              <ul className="h-[32rem]">
                {records.map((e) => {
                  return <RegisteredUserEntry entry={e} key={e._id} />;
                })}
              </ul>
            </ScrollArea>
          </CardContent>
        </EmptyStateConceal>
      </EmptyState>
    </Card>
  );
}

function useVisitCount({ userId }: { userId: string }) {
  const response = useQuery(api.myFunctions.registrationCount, {
    userId: userId,
  });

  return Option.fromNullable(response);
}

export function CustomerAvatar({
  userId,
  className = "w-8 h-8",
}: { userId: string; className?: string }) {
  const user = useCustomer({ userId }) ?? { firstName: "", lastName: "" };

  return (
    <Avatar className={className}>
      <AvatarImage
        src={"undefined"}
        alt="User Avatar"
        className="object-cover"
      />
      <AvatarFallback>{CustomerImpl.initials(user)}</AvatarFallback>
    </Avatar>
  );
}

type AccessPlan =
  | { kind: "free" }
  | { kind: "paid"; amount: number }
  | undefined;

export function RegisteredUserEntry({
  entry,
}: {
  entry: {
    userId: string;
    timestamp: string;
    access?: AccessPlan;
    ticketId?: string;
  };
}) {
  const user = useCustomer({ userId: entry.userId }) ?? {
    firstName: "",
    lastName: "",
  };
  const visitCount = useVisitCount({ userId: entry.userId });
  const diffFromNow = format_time_to_now(entry.timestamp);
  const can_modify_plan = entry.ticketId
    ? false
    : differenceInHours(Date.now(), entry.timestamp) < 24;

  if (!user) return null;

  return (
    <li className="flex group items-center group gap-4 pt-2 px-4">
      <CustomerAvatar userId={entry.userId} className="w-10 h-10" />

      <div className="group-last:border-none border-b flex items-center flex-1 pb-2">
        <div className="flex-1">
          <div className="font-semibold">
            {user.firstName} {user.lastName}
          </div>

          <div className="flex gap-2 text-sm text-gray-500 font-mono">
            <PaymentBadge data={entry.access} />•
            <div>
              {pipe(
                visitCount,
                Option.map(safeNum),
                Option.map((visitCount) => {
                  return (
                    <React.Fragment key={"visit"}>
                      {serialNo(visitCount ?? 0)} visit
                      {visitCount < 2 ? "" : "s"}
                    </React.Fragment>
                  );
                }),
                Option.getOrElse(() => <>-- visits</>),
              )}
            </div>
          </div>
        </div>

        <If cond={can_modify_plan}>
          <RoleChangingButton id={entry.userId} />
        </If>

        <div
          className={cn("inline-block text-sm font-semibold text-foreground", {
            "group-hover:hidden": can_modify_plan,
          })}
        >
          {diffFromNow}
        </div>
      </div>
    </li>
  );
}

function RoleChangingButton({ id }: { id: string }) {
  const changePlan = useMutation(api.register.updateTodaysRegisterAccess);

  return (
    <div className="hidden group-hover:flex items-center gap-1">
      <Button
        title="Mark as Paying customer"
        size="icon"
        variant="secondary"
        onClick={() => {
          changePlan({ userId: id, plan: "daily" });
        }}
      >
        <Crown className="h-4 w-4" />
      </Button>

      <Button
        title="Mark as Free customer"
        size="icon"
        variant="outline"
        onClick={() => {
          changePlan({ userId: id, plan: "free" });
        }}
      >
        <Gift className="h-4 w-4" />
      </Button>
    </div>
  );
}

const map = {
  paid: "text-[oklch(0.44_0.3_264.05)]",
  free: "text-foreground",
  "--": "destructive",
} as const;

function PaymentBadge({ data }: { data: AccessPlan }) {
  const _kind = data?.kind ?? "--";

  return <span className={cn(map[_kind], "capitalize")}>{_kind ?? "--"}</span>;
}

export const CustomerImpl = {
  initials: (customer: { firstName: string; lastName: string }) => {
    return `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`;
  },
};

function format_time_to_now(date_: unknown) {
  const date = parseISO(String(date_));
  const current = Date.now();

  const days = differenceInDays(current, date);

  if (days >= 1) {
    return `${Math.floor(days)}d`;
  }

  const hrs = Math.abs(differenceInHours(current, date));
  if (hrs >= 1) {
    return `${hrs}h`;
  }

  const mins = differenceInMinutes(current, date);
  if (mins >= 1) {
    return `${mins}m`;
  }

  const secs = differenceInSeconds(current, date);
  if (secs >= 0) {
    return `${secs}s`;
  }

  return "now";
}

export function TopCustomersAvatarGroup() {

  const { filter: dateFilter } = DateRange.useState();

  const [startDate, endDate] = React.useMemo(
    () => dateFilter.get_range(Date.now()),
    [dateFilter],
  );

  const topCustomers =
    useQuery(api.customers.getTopCustomers, {
      limit: 50,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      filter: "all",
    }) ?? [];

  const displayCustomers = topCustomers;
  const top6 = displayCustomers.slice(0, 6);
  const extra = Math.max(0, displayCustomers.length - top6.length);

  return (
    <EmptyState isEmpty={displayCustomers.length === 0}>
      <EmptyStateContent>
        <Button
          variant="outline"
          disabled
          className="h-auto p-2 px-4 rounded-full flex items-center justify-center"
        >
          <span className="text-xs text-muted-foreground">
            No Top Customers yet
          </span>
        </Button>
      </EmptyStateContent>

      <Sheet>
        <EmptyStateConceal>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="h-auto p-2 pl-4 rounded-full flex items-center gap-3"
            >
              <div className="flex -space-x-3">
                {top6.map((customer, i) => (
                  <CustomerAvatar
                    key={customer.userId}
                    userId={customer.userId}
                    className={cn(
                      "w-8 h-8 border-2 border-background ring-2 ring-transparent transition-all",
                      "hover:z-10 pointer-events-none",
                    )}
                  />
                ))}
              </div>
              <div className="flex flex-col items-start text-xs text-muted-foreground mr-2">
                <span className="font-medium text-foreground">
                  Star Customers
                </span>
                <If cond={extra > 0}>
                  <span>+{extra} more</span>
                </If>
              </div>
            </Button>
          </SheetTrigger>
        </EmptyStateConceal>

        <TopCustomersSheet />
      </Sheet>
    </EmptyState>
  );
}

function TopCustomersSheet() {
  const [filter, setFilter] = React.useState<"all" | "free" | "paid">("all");

  const { filter: dateFilter } = DateRange.useState();

  const [startDate, endDate] = React.useMemo(
    () => dateFilter.get_range(Date.now()),
    [dateFilter],
  );

  const response =
    useQuery(api.customers.getTopCustomers, {
      limit: 50,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      filter: filter,
    });

  const displayCustomers = safeArray(response);

  return (
    <SheetContent
      side="right"
      className="w-full sm:max-w-md p-0 flex flex-col h-screen"
    >
      <SheetHeader className="p-6 border-b">
        <SheetTitle>Top Customers</SheetTitle>
      </SheetHeader>

      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as typeof filter)}
        className="w-full flex flex-1 flex-col"
      >
        <div className="flex items-center justify-between px-4 gap-4">
          <TabsList>
            <TabsTrigger value="all" className="px-4">
              All
            </TabsTrigger>
            <TabsTrigger value="free" className="px-4">
              Free
            </TabsTrigger>
            <TabsTrigger value="paid" className="px-4">
              Paid
            </TabsTrigger>
          </TabsList>

          <DateRange.Dropdown />
        </div>

        <ScrollArea className="h-[80svh]">
          {response === undefined ?
            [...Array(5)].map((_, i) => (
              <li key={i} className="flex items-center gap-4 py-4 px-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-24 h-4" />
                  <Skeleton className="w-16 h-3" />
                </div>
              </li>
            )) :
            <EmptyState isEmpty={displayCustomers.length === 0}>
              <div className="flex flex-col items-center justify-center">
                <EmptyStateContent className="py-16">
                  <Crown className="w-8 h-8 text-muted-foreground" />
                  <EmptyStateTitle>No customers found</EmptyStateTitle>
                  <EmptyStateDescription>
                    No customers in this date range.
                  </EmptyStateDescription>
                </EmptyStateContent>
              </div>

              <EmptyStateConceal>
                <ul className="divide-y divide-border grow-0 shrink-1 overflow-hidden flex flex-col">
                  {displayCustomers.map((customer, i) => (
                    <li
                      key={customer.userId}
                      className="flex text-xs items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="font-mono text-[1em] text-muted-foreground w-4 text-center">
                        {serialNo(i + 1)}
                      </div>

                      <CustomerAvatar
                        userId={customer.userId}
                        className="w-8 h-8"
                      />

                      <div className="flex-1">
                        <div className="font-semibold text-[1.2em]">
                          {customer.name}
                        </div>
                        <div className="flex items-center gap-2 text-[1em] text-muted-foreground">
                          <span>
                            {serialNo(customer.visits)} visit
                            {customer.visits === 1 ? "" : "s"}
                          </span>
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded",
                              customer.accessPlan === "paid"
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                            )}
                          >
                            {customer.accessPlan}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </EmptyStateConceal>
            </EmptyState>}

        </ScrollArea>
      </Tabs>
    </SheetContent>
  );
}
