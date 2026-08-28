"use client";
import { useQuery } from "convex/react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { isNullable } from "effect/Predicate";
import React from "react";
import { Area, AreaChart, XAxis } from "recharts";
import { RegisteredUserEntry } from "@/components/customers";
import { DateRange } from "@/components/DateRange";
import { If } from "@/components/if";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { currencyFormatter } from "@/lib/currency.helpers";
import { safeArray, safeNum, serialNo } from "@/lib/data.helpers";
import { O, pipe } from "@/lib/fp.helpers";

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
    // eslint-disable-next-line react-hooks/purity
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
      <Card className="aspect-[3/2] w-full">
        <CardContent className="flex pt-4 flex-1 flex-col">
          <div className="flex justify-between">
            <CardDescription className="text-muted-foreground">
              Total visits
            </CardDescription>
            <DateRange.Dropdown />
          </div>

          <span className="text-3xl font-semibold">
            <If cond={!is_nullable}>{MetricsValue.count(count)}</If>
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

export function CashPayments() {
  return (
    <DateRange.Provider>
      <CashPaymentsCard />
    </DateRange.Provider>
  );
}

function CashPaymentsCard() {
  const { filter } = DateRange.useState();

  const [start, end] = React.useMemo(() => {
    return filter.get_range(today);
  }, [filter]);

  const result = useCachedQuery(api.metrics.sumCashPayments, {
    start: start.toISOString(),
    end: end.toISOString(),
  });

  const trend = useCachedQuery(api.metrics.metricsDailyCashPayments, {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  });

  const is_empty = safeArray(trend).length === 0;

  return (
    <div className="@container">
      <Card className="aspect-[3/2] w-full">
        <CardContent className="flex pt-4 flex-1 flex-col justify-between gap-4">
          <div className="flex justify-between">
            <div className="flex gap-2 items-end">
              <CardDescription className="text-muted-foreground">
                Cash Payments
              </CardDescription>
              <span className="text-xs opacity-50 text-muted-foreground">
                {format(start, "d MMM, yy")} — Now
              </span>
            </div>

            <DateRange.Dropdown />
          </div>

          <div>
            <span className="text-3xl font-semibold">
              {MetricsValue.currency(result?.total)}
            </span>

            <div className="text-xs opacity-50">
              {MetricsValue.count(result?.count)} payments
            </div>
          </div>

          <div className="h-16 -mx-6 flex *:flex-1">
            {is_empty ? (
              <div className="text-xs text-muted-foreground px-6">
                No cash payments
              </div>
            ) : (
              <ChartContainer
                config={{ cash: { label: "Cash", color: "#22c55e" } }}
              >
                <AreaChart
                  data={trend}
                  margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) =>
                          format(
                            new Date(`${value as string}T00:00:00`),
                            "d MMM, yy",
                          )
                        }
                        formatter={(value) =>
                          MetricsValue.currency(value as number)
                        }
                      />
                    }
                    cursor={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCash)"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const MetricsValue = {
  currency(value: number | undefined) {
    return currencyFormatter.format(safeNum(value)).replace("NGN", "₦");
  },
  count(value: number | undefined) {
    const count = safeNum(value);
    return count;
  },
};

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
                O.map((value) => MetricsValue.currency(value)),
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
              {MetricsValue.currency(safeNum(count) * base_fee)}
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
