"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { addDays, format } from "date-fns";
import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { DateRange } from "./DateRange";

const chartConfig = {
  users: {
    label: "Users",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function MetricsChart() {
  return (
    <DateRange.Provider
      filters={DateRange.filters.filter(
        (e) => e.key === "week" || e.key === "month",
      )}
    >
      <MetricsChartChild />
    </DateRange.Provider>
  );
}

function MetricsChartChild() {
  const { filter } = DateRange.useState();

  const [from, to] = filter.get_range(new Date());

  const metrics = useQuery(api.metrics.metricsDailyAttendance, {
    start: format(from, "yyyy-MM-dd"),
    end: format(to, "yyyy-MM-dd"),
  });

  const chartData = React.useMemo(() => {
    return padRecords(
      filter.key === "week" ? 7 : 30,
      new Date(),
      metrics || [],
    );
  }, [metrics, filter.key]);

  return (
    <Card>
      <CardHeader className="flex relative flex-row justify-between">
        <div className="flex gap-1 flex-col flex-1">
          <CardTitle>Daily Attendance Metrics</CardTitle>
          <CardDescription>
            Showing total users for the selected date range
          </CardDescription>
        </div>

        <div>
          <DateRange.Dropdown />
        </div>
      </CardHeader>

      <CardContent>
        <div className="gap-4 flex items-end">
          <ChartContainer
            config={chartConfig}
            className="flex-1 h-[250px] w-full"
          >
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    }}
                  />
                }
              />
              <Bar dataKey="users" fill="var(--color-users)" radius={4} />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function padRecords(
  length: number,
  startDate: Date,
  arr: { date: string; users: number }[],
) {
  const currentLength = arr.length;

  if (currentLength >= length) {
    return arr;
  }

  const padCount = length - currentLength;
  const paddedEntries = [];

  const firstDate = arr.length > 0 ? new Date(arr[0].date) : startDate;

  for (let i = 1; i <= padCount; i++) {
    paddedEntries.push({
      date: format(addDays(firstDate, 0 - i), "yyyy-MM-dd"),
      users: 0,
    });
  }

  return [...paddedEntries.reverse(), ...arr];
}
