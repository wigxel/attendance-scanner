"use client";
import {
  startOfMonth,
  endOfMonth,
  startOfDay,
  subMonths,
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  addYears,
} from "date-fns";
import { If } from "@/components/if";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { safeNum, serialNo } from "@/lib/data.helpers";
import { useQuery } from "convex/react";
import { isNullable } from "effect/Predicate";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import React from "react";
import { currencyFormatter } from "@/lib/currency.helpers";

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

export function TotalVisits() {
  const filter = useFilter();

  const [start, end] = React.useMemo(() => {
    return filter.filter.get_range(today);
  }, [filter.filter]);

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
            <RangeDropdown value={filter.filter} onChange={filter.setFilter} />
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
  const count = useQuery(api.customers.countCustomers);
  const is_nullable = isNullable(count);

  return (
    <div className="@container">
      <Card className="aspect-[3/1.5] w-full">
        <CardContent className="flex pt-4 flex-col gap-2">
          <CardDescription>Estimated Revenue</CardDescription>
          <span className="text-3xl font-semibold">
            <If cond={!is_nullable}>
              {currencyFormatter.format(safeNum(count))}
            </If>
            <If cond={is_nullable}>{"--"}</If>
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

function RangeDropdown(props: {
  value: FilterOption;
  onChange: (filter: FilterOption) => void;
}) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground focus:outline-none hover:underline focus:text-primary">
          <span>{props.value.label} </span>
          <ChevronDown size="1em" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          {filters.map((filter) => {
            return (
              <DropdownMenuItem
                key={filter.label}
                className="text-xs"
                onClick={() => {
                  props.onChange(filter);
                }}
              >
                {filter.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

type FilterOption = {
  key: string;
  label: string;
  get_range: (date: Date | number) => [Date, Date];
};

const filters: FilterOption[] = [
  {
    key: "week",
    label: "Last 7 days",
    get_range: (today) => {
      const start = startOfWeek(today);
      const end = endOfWeek(today);

      return [start, end];
    },
  },
  {
    key: "month",
    label: "This Month",
    get_range: (today) => {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      return [start, end];
    },
  },
  {
    key: "last_month",
    label: "Last Month",
    get_range: (today) => {
      const date_ = addDays(startOfMonth(today), -1);
      const start = date_;
      const end = endOfMonth(today);

      return [start, end];
    },
  },
  {
    key: "last_3_month",
    label: "Last 3 months",
    get_range: (today) => {
      const date_ = addMonths(today, -3);
      const start = startOfMonth(date_);
      const end = endOfMonth(today);

      return [start, end];
    },
  },
  {
    key: "last_6_month",
    label: "Last 6 months",
    get_range: (today) => {
      const date_ = addMonths(today, -6);
      const start = startOfMonth(date_);
      const end = endOfMonth(today);

      return [start, end];
    },
  },
  {
    key: "last_year",
    label: "Last Year",
    get_range: (today) => {
      const start = addYears(today, -1);
      const end_date = new Date();

      return [start, end_date];
    },
  },
] as const;

function useFilter(filter_key: "month" | "week" = "month") {
  const [filter, setFilter] = React.useState(() => {
    return filters.find((e) => e.key === filter_key) ?? filters[0];
  });

  return { filter, setFilter };
}
