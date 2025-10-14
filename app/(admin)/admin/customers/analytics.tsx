"use client";
import { If } from "@/components/if";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { currencyFormatter } from "@/lib/currency.helpers";
import { safeNum, serialNo } from "@/lib/data.helpers";
import { O, pipe } from "@/lib/fp.helpers";
import { useQuery } from "convex/react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { isNullable } from "effect/Predicate";
import React from "react";

export function Analytics() {
  const count = useQuery(api.customers.countCustomers);
  const is_nullable = isNullable(count);

  return (
    <div className="grid grid-cols-4">
      <Card className="aspect-[3/1.5]">
        <CardContent className="flex pt-4 flex-col gap-2">
          <CardDescription>Total customers</CardDescription>
          <span className="text-3xl font-semibold">
            <If cond={!is_nullable}>{serialNo(safeNum(count))}</If>
            <If cond={is_nullable}>{"--"}</If>
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

const today = Date.now();

import { DateRange } from "@/components/DateRange";

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
