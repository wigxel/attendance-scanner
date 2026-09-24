"use client";

import { useQuery } from "convex/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { TemperatureHeatmap } from "./temperature-heatmap";

export function CalendarSection() {
  const dailyBuckets = useQuery(api.roomMetrics.getDailyCalendar, {
    roomId: "all",
    days: 371,
  });

  if (dailyBuckets === undefined) {
    return <Skeleton className="h-[140px]" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Temperature calendar</CardTitle>
        <CardDescription>
          Last 53 weeks · daily average (trailing week)
        </CardDescription>
      </CardHeader>

      <CardContent>
        <TemperatureHeatmap dailyBuckets={dailyBuckets} />
      </CardContent>
    </Card>
  );
}
