"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { columns } from "@/components/columns";
import { DataTableDemo } from "@/components/DataTable";
import { safeArray, safeNum, serialNo } from "@/lib/data.helpers";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import React from "react";
import { useCustomer } from "@/hooks/auth";
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, formatISO, parseISO, setHours } from "date-fns";
import { pipe, Option } from "effect";
import { EmptyState, EmptyStateConceal, EmptyStateContent, EmptyStateDescription, EmptyStateTitle } from "./empty-state";
import { ScrollArea } from "./ui/scroll-area";

export function useUsers() {
  const record = useQuery(api.myFunctions.getAllUsers);

  return { data: safeArray(record) };
}

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

export function TodaysCustomers() {
  const date = React.useMemo(() => {
    const today = new Date();
    const start = formatISO(setHours(today, 0));
    const end = formatISO(setHours(today, 23));

    return { start, end }
  }, []);

  const records = safeArray(useQuery(api.myFunctions.getDailyRegister, {
    ...date
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span>Today&apos;s Scan</span>&nbsp;&nbsp;
          <span className="text-muted-foreground font-mono font-normal">
            {serialNo(records.length)}
          </span>
        </CardTitle>
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
                  return (
                    <RegisteredUserEntry entry={e} key={e._id} />
                  );
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

  return Option.fromNullable(response)
}

function RegisteredUserEntry({ entry }: { entry: { userId: string, timestamp: string } }) {
  const user = useCustomer({ userId: entry.userId }) ?? { firstName: '', lastName: '' };
  const visitCount = useVisitCount({ userId: entry.userId })
  const diffFromNow = format_time_to_now(entry.timestamp)

  if (!user) return null;

  return (
    <li className="flex items-center group gap-4 pt-2 px-4">
      <Avatar className="w-10 h-10">
        <AvatarImage
          src={"undefined"}
          alt="User Avatar"
          className="object-cover"
        />
        <AvatarFallback>{CustomerImpl.initials(user)}</AvatarFallback>
      </Avatar>

      <div className="group-last:border-none border-b flex items-center flex-1 pb-2">
        <div className="flex-1">
          <div className="font-semibold">
            {user.firstName} {user.lastName}
          </div>

          <div className="text-sm text-gray-500 font-mono">
            {
              pipe(
                visitCount,
                Option.map(safeNum),
                Option.map(visitCount => {
                  return <React.Fragment key={'visit'}>
                    {serialNo(visitCount ?? 0)} visit{visitCount < 2 ? '' : 's'}
                  </React.Fragment>
                }),
                Option.getOrElse(() => <>-- visits</>)
              )
            }
          </div>
        </div>

        <div className="text-sm font-semibold text-foreground">
          {diffFromNow}
        </div>
      </div>
    </li>
  );
}

export const CustomerImpl = {
  initials: (customer: { firstName: string; lastName: string }) => {
    return `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`;
  },
};

function format_time_to_now(date_: unknown) {
  const date = parseISO(String(date_));
  const current = Date.now();

  const days = differenceInDays(current, date)

  if (days >= 1) {
    return `${Math.floor(days)}d`
  }

  const hrs = Math.abs(differenceInHours(current, date));
  if (hrs >= 1) {
    return `${hrs}h`
  }

  const mins = differenceInMinutes(current, date);
  if (mins >= 1) {
    return `${mins}m`
  }

  const secs = differenceInSeconds(current, date);
  if (secs >= 0) {
    return `${secs}s`
  }

  return 'now'
}
