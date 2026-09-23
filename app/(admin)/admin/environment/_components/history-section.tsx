"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

export function HistorySection() {
  const historyBuckets = useQuery(api.roomMetrics.history, { roomId: "all", limit: 100 });

  if (historyBuckets === undefined) {
    return <Skeleton className="h-[280px]" />;
  }
  const chartData = [...historyBuckets].reverse().map((bucket) => ({
    time: format(new Date(bucket.bucketStart), "HH:mm"),
    temperature: bucket.avgTemperature,
    humidity: bucket.avgHumidity,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>Last {chartData.length} buckets</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-sm text-muted-foreground">No history yet</div>
        ) : (
          <ChartContainer config={{ temperature: { label: "Temp °C", color: "#f59e0b" }, humidity: { label: "Hum %", color: "#3b82f6" } }} className="h-[250px] w-full">
            <LineChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="temperature" stroke="var(--color-temperature)" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="humidity" stroke="var(--color-humidity)" dot={false} strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
