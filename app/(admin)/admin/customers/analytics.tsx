"use client";
import { RegisteredUserEntry } from "@/components/customers";
import { If } from "@/components/if";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import { currencyFormatter } from "@/lib/currency.helpers";
import { safeNum, serialNo } from "@/lib/data.helpers";
import { O, pipe } from "@/lib/fp.helpers";
import { DateRange } from "@/components/DateRange";
import { useQuery } from "convex/react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { isNullable } from "effect/Predicate";
import React from "react";

type MetricKind =
  | "totalCustomers"
  | "newCustomers"
  | "activeCustomers"
  | "repeatCustomerRate"
  | "avgVisitsPerCustomer"
  | "lapsedCustomers";

function MetricCard({
  label,
  kind,
  suffix,
  aggregation = "latest",
}: {
  label: string;
  kind: MetricKind;
  suffix?: string;
  aggregation?: "sum" | "avg" | "latest";
}) {
  const { filter } = DateRange.useState();
  const [startObj, endObj] = React.useMemo(
    () => filter.get_range(Date.now()),
    [filter],
  );
  const start = format(startObj, "yyyy-MM-dd");
  const end = format(endObj, "yyyy-MM-dd");

  const value = useQuery(api.customers.getCustomerMetrics, {
    kind,
    start,
    end,
    aggregation,
  });
  const is_nullable = isNullable(value);

  const startTime = startObj.getTime();
  const newCustomers = useQuery(api.customers.listNewCustomers, { startTime });

  const isNewCustomersCard = kind === "newCustomers";

  const cardContent = (
    <Card className="aspect-[3/1.5]">
      <CardContent className="flex pt-4 flex-col gap-2">
        <CardDescription>{label}</CardDescription>
        <span className="text-3xl font-semibold">
          <If cond={!is_nullable}>
            {suffix === "%"
              ? `${safeNum(value)}%`
              : suffix === "x"
                ? `${safeNum(value)}x`
                : serialNo(safeNum(value))}
          </If>
          <If cond={is_nullable}>{"--"}</If>
        </span>
      </CardContent>
    </Card>
  );

  if (isNewCustomersCard) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
          <TooltipContent side="bottom" className="w-80 p-0 max-h-[400px]">
            <ScrollArea className="h-[300px]">
              <ul className="py-2">
                {newCustomers === undefined && (
                  <li className="px-4 py-2 text-sm text-muted-foreground text-center">
                    Loading...
                  </li>
                )}
                {newCustomers?.length === 0 && (
                  <li className="px-4 py-2 text-sm text-muted-foreground text-center">
                    No new customers in this range
                  </li>
                )}
                {newCustomers?.map((customer) => (
                  <RegisteredUserEntry
                    key={customer._id}
                    entry={{
                      userId: customer.id,
                      timestamp: new Date(customer._creationTime).toISOString(),
                    }}
                  />
                ))}
              </ul>
            </ScrollArea>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
}

export function Analytics() {
  return (
    <DateRange.Provider>
      <div className="p-4 pt-0">
        <div className="flex justify-end mb-4">
          <DateRange.Dropdown />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard label="Total customers" kind="totalCustomers" />
          <MetricCard label="New customers" kind="newCustomers" />
          <MetricCard label="Active customers" kind="activeCustomers" />
          <MetricCard
            label="Repeat customer rate"
            kind="repeatCustomerRate"
            suffix="%"
          />
          <MetricCard
            label="Avg visits per customer"
            kind="avgVisitsPerCustomer"
            suffix="x"
            aggregation="avg"
          />
          <MetricCard label="Lapsed customers" kind="lapsedCustomers" />
        </div>
      </div>
    </DateRange.Provider>
  );
}

const today = Date.now();

export function TotalVisits() {
  return (
    <DateRange.Provider>
      <TotalVisitsCard />
    </DateRange.Provider>
  );
}

function TotalVisitsCard() {
  const { filter } = DateRange.useState();

  const [start, end] = React.useMemo(() => {
    return filter.get_range(today);
  }, [filter]);

  const count = useQuery(api.myFunctions.countAttendance, {
    start: start.toISOString(),
    end: end.toISOString(),
  });
  const is_nullable = isNullable(count);

  return (
    <div className="@container">
      <Card className="aspect-[3/1.5] w-full">
        <CardContent className="flex pt-4 flex-1 flex-col">
          <div className="flex justify-between">
            <CardDescription className="text-muted-foreground">
              Total visits
            </CardDescription>
            <DateRange.Dropdown />
          </div>

          <span className="text-3xl font-semibold">
            <If cond={!is_nullable}>{serialNo(safeNum(count))}</If>
            <If cond={is_nullable}>{"--"}</If>
          </span>

          <div>
            <span className="text-xs text-muted-foreground">
              {format(start, "d MMM, yy")} — Now
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function TotalRevenue() {
  const range = {
    start: startOfMonth(today).toISOString(),
    end: endOfMonth(today).toISOString(),
  };

  const count = useQuery(api.myFunctions.countAttendance, range);
  const total = useQuery(api.metrics.sumPaidAccess, range);

  const is_nullable = isNullable(count);
  const base_fee = 1000;

  return (
    <div className="@container flex flex-col gap-4">
      <Card className="aspect-[3/1.5] w-full relative">
        <CardContent className="flex pt-4 flex-col gap-2">
          <CardDescription>Actual Revenue</CardDescription>
          <span className="text-3xl font-semibold">
            <If cond={!is_nullable}>
              {pipe(
                O.fromNullable(total),
                O.map((value) => currencyFormatter.format(value)),
                O.getOrElse(() => "--"),
              )}
            </If>
            <If cond={is_nullable}>{"--"}</If>
          </span>
          <div className="p-4 text-xs text-muted-foreground absolute bottom-0 right-0">
            Area is for graph
          </div>
        </CardContent>
      </Card>

      <Card className="aspect-[3/1.5] w-full relative">
        <CardContent className="flex pt-4 flex-col gap-2">
          <CardDescription>Estimated Revenue</CardDescription>
          <span className="text-3xl font-semibold">
            <If cond={!is_nullable}>
              {currencyFormatter.format(safeNum(count) * base_fee)}
            </If>
            <If cond={is_nullable}>{"--"}</If>
          </span>

          <div className="p-4 text-xs text-muted-foreground absolute bottom-0 right-0">
            Area is for graph
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
