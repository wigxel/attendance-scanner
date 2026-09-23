"use client";

import { useQuery } from "convex/react";
import { RoomTemperatureWidgetPure } from "@/components/room-temperature-widget-pure";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { comfortZone, condensationRisk, dewPoint, dewPointDepression, dryAirRisk, moldRisk } from "@/lib/environment";

export function InsightsSection() {
  const liveBucket = useQuery(api.roomMetrics.getLiveReading, { roomId: "all" });

  if (liveBucket === undefined) {
    return <Skeleton className="h-[140px]" />;
  }

  if (liveBucket === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
          <CardDescription>No readings yet — waiting for sensor data</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const temperature = liveBucket.avgTemperature;
  const humidity = liveBucket.avgHumidity;
  const pressure = liveBucket.avgPressure;
  const dewPointValue = dewPoint(temperature, humidity);
  const depression = dewPointDepression(temperature, dewPointValue);
  const comfort = comfortZone(temperature, humidity);

  return (
    <div className="grid grid-cols-5 gap-4">
      <RoomTemperatureWidgetPure temperature={temperature} humidity={humidity} pressure={pressure} />
      <Card className="aspect-3/1.2">
        <CardHeader className="p-4 pb-2">
          <CardDescription>Comfort</CardDescription>
          <CardTitle className="text-base capitalize">{comfort.status}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 text-xs text-muted-foreground">{comfort.reason}</CardContent>
      </Card>
      <Card className="aspect-3/1.2">
        <CardHeader className="p-4 pb-2">
          <CardDescription>Mold</CardDescription>
          <CardTitle className="text-base">{moldRisk(humidity, depression)}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 text-xs text-muted-foreground">RH&gt;60% or depression&lt;3°C</CardContent>
      </Card>
      <Card className="aspect-3/1.2">
        <CardHeader className="p-4 pb-2">
          <CardDescription>Dry air</CardDescription>
          <CardTitle className="text-base">{dryAirRisk(humidity)}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="aspect-3/1.2">
        <CardHeader className="p-4 pb-2">
          <CardDescription>Condensation</CardDescription>
          <CardTitle className="text-base">{condensationRisk(depression)}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 text-xs text-muted-foreground">depression {depression.toFixed(1)}°C · Td {dewPointValue.toFixed(1)}°C</CardContent>
      </Card>
    </div>
  );
}
