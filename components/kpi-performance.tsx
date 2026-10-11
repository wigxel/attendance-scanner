"use client";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import * as React from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { serialNo } from "@/lib/data.helpers";
import { DateRange } from "./DateRange";

const chartConfig = {
  earned: { label: "Points", color: "hsl(var(--chart-1))" },
  pct: { label: "% of available", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

type LeaderboardRowProps = {
  userId: string;
  earned: number;
  pct: number;
  rank: number;
};

function LeaderboardRow({ userId, earned, pct, rank }: LeaderboardRowProps) {
  const profile = useQuery(api.myFunctions.getUserById, { userId });
  const name =
    profile === undefined
      ? "…"
      : profile
        ? `${profile.firstName} ${profile.lastName}`
        : userId.slice(0, 8);

  return (
    <li className="flex items-center gap-3 p-3">
      <span className="w-6 text-sm font-bold text-muted-foreground">
        {serialNo(rank)}
      </span>
      <Avatar className="h-8 w-8">
        <AvatarFallback>
          {name
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")}
        </AvatarFallback>
      </Avatar>
      <span className="flex-1 text-sm font-medium">{name}</span>
      <Badge variant="secondary">{earned} pts</Badge>
      <Badge>{pct.toFixed(0)}%</Badge>
    </li>
  );
}

function PerformanceChild() {
  const { filter } = DateRange.useState();
  const [from, to] = filter.get_range(new Date());

  const data = useQuery(api.kpis.performance, {
    from: format(from, "yyyy-MM-dd"),
    to: format(to, "yyyy-MM-dd"),
  });

  const chartData = React.useMemo(() => {
    if (!data) return [];
    return data.daily.map((d) => {
      const earned = Object.values(d.earned).reduce((s, v) => s + v, 0);
      return {
        date: d.date,
        earned,
        pct: d.available > 0 ? Math.round((earned / d.available) * 100) : 0,
      };
    });
  }, [data]);

  if (!data) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex relative flex-row justify-between">
          <div className="flex gap-1 flex-col flex-1">
            <CardTitle>Points over time</CardTitle>
            <CardDescription>
              Earned points and % of available per day
            </CardDescription>
          </div>
          <div>
            <DateRange.Dropdown />
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ComposedChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis yAxisId="left" tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                yAxisId="left"
                dataKey="earned"
                fill="var(--color-earned)"
                radius={4}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="pct"
                stroke="var(--color-pct)"
                dot={false}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>
            Ranked by % of available in the selected range
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          {data.leaderboard.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No points earned in this range yet.
            </p>
          ) : (
            <ul className="divide-y">
              {data.leaderboard.map((entry, i) => (
                <LeaderboardRow
                  key={entry.userId}
                  userId={entry.userId}
                  earned={entry.earned}
                  pct={entry.pct}
                  rank={i + 1}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function KpiPerformance() {
  return (
    <DateRange.Provider
      filters={DateRange.filters.filter(
        (e) => e.key === "week" || e.key === "month",
      )}
    >
      <PerformanceChild />
    </DateRange.Provider>
  );
}
