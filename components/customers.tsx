"use client";
import { DataTableDemo } from "@/components/DataTable";
import { columns } from "@/components/columns";
import { api } from "@/convex/_generated/api";
import { useCustomer } from "@/hooks/auth";
import { safeArray, safeNum, serialNo } from "@/lib/data.helpers";
import { DateParse } from "@/lib/date.helpers";
import { O } from "@/lib/fp.helpers";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";
import useEvent from "react-use-event-hook";
import {
  EmptyState,
  EmptyStateConceal,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "./empty-state";
import { If } from "./if";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge, badgeVariants } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";

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

  const adjustDate = React.useCallback((days: number) => {
    setCurrent(prev => {
      const newDate = new Date(parseISO(prev.start));
      newDate.setDate(newDate.getDate() + days);
      return createDateRange(newDate);
    });
  }, [createDateRange]);

  const incrementBy = React.useCallback((days: number) => adjustDate(days), [adjustDate]);
  const decrementBy = React.useCallback((days: number) => adjustDate(-days), [adjustDate]);

  return {
    isToday: isToday(current.start),
    current: current,
    incrementBy,
    decrementBy
  }
}

export function TodaysCustomers() {
  const attendanceHandler = useAttendanceRegister();

  const records = safeArray(
    useQuery(api.myFunctions.getDailyRegister, {
      ...attendanceHandler.current
    }),
  );

  return (
    <Card className="min-h-[32rem]">
      <CardHeader className="flex flex-row items-center space-y-0">
        <CardTitle className="flex-1">
          <span>
            <If cond={attendanceHandler.isToday}>
              Today&apos;s Scan
            </If>

            <If cond={!attendanceHandler.isToday}>
              {DateParse.presets.dateOnly(attendanceHandler.current.start).pipe(
                O.getOrElse(() => '--')
              )}
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

type AccessPlan = { kind: "free" } | { kind: "paid"; amount: number } | undefined;

function RegisteredUserEntry({
  entry,
}: {
  entry: {
    userId: string;
    timestamp: string;
    access?: AccessPlan
  };
}) {
  const user = useCustomer({ userId: entry.userId }) ?? {
    firstName: "",
    lastName: "",
  };
  const visitCount = useVisitCount({ userId: entry.userId });
  const diffFromNow = format_time_to_now(entry.timestamp);

  if (!user) return null;

  return (
    <li className="flex items-center group gap-4 pt-2 px-4">
      <CustomerAvatar userId={entry.userId} className="w-10 h-10" />

      <div className="group-last:border-none border-b flex items-center flex-1 pb-2">
        <div className="flex-1">
          <div className="font-semibold">
            {user.firstName} {user.lastName}
          </div>

          <div className="flex gap-2 text-sm text-gray-500 font-mono">
            <PaymentBadge data={entry.access} />
            •
            <div>
              {pipe(
                visitCount,
                Option.map(safeNum),
                Option.map((visitCount) => {
                  return (
                    <React.Fragment key={"visit"}>
                      {serialNo(visitCount ?? 0)} visit{visitCount < 2 ? "" : "s"}
                    </React.Fragment>
                  );
                }),
                Option.getOrElse(() => <>-- visits</>),
              )}
            </div>
          </div>
        </div>

        <div className="text-sm font-semibold text-foreground">
          {diffFromNow}
        </div>
      </div>
    </li>
  );
}

const map = {
  "paid": "text-[oklch(0.44_0.3_264.05)]",
  "free": "text-foreground",
  "--": "destructive"
} as const;

function PaymentBadge({ data }: { data: AccessPlan }) {
  const _kind = data?.kind ?? "--";

  return <span className={cn(map[_kind], "capitalize")}>
    {_kind ?? "--"}
  </span>
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
