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
import { addDays, endOfMonth, format, startOfMonth } from "date-fns";
import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

const chartConfig = {
  users: {
    label: "Users",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

type TParams = {
  from: Date | undefined;
  to: Date | undefined;
};

const setDefault = {
  from: startOfMonth(new Date()),
  to: endOfMonth(new Date())
}

export function MetricsChart() {
  const dateRange = React.useRef<TParams>(setDefault).current;

  const metrics = useQuery(api.metrics.metricsDailyAttendance, {
    start: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "",
    end: format(dateRange.to ?? addDays(dateRange.from ?? setDefault.from, 30), "yyyy-MM-dd")
  });

  const chartData = React.useMemo(() => {
    return padRecords(30, dateRange.from ?? new Date(), metrics || []);
  }, [metrics, dateRange.from]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Attendance Metrics</CardTitle>
        <CardDescription>
          Showing total users for the selected date range
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="gap-4 flex items-end">
          <ChartContainer config={chartConfig} className="flex-1 h-[250px] w-full">
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
  arr: { date: string; users: number }[]
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
