"use client";

import { useQuery } from "convex/react";
import { Info } from "lucide-react";
import { RoomTemperatureWidgetPure } from "@/components/room-temperature-widget-pure";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import { comfortZone, condensationRisk, dewPoint, dewPointDepression, dryAirRisk, moldRisk } from "@/lib/environment";
import type { ComfortResult } from "@/lib/environment";

const COMFORT_TOOLTIPS = {
  good: "Air feels nice — not too hot, not too cold.",
  warning: "Air is a little off — let's adjust.",
  cold: "Air feels too cold — wear a sweater.",
  hot: "Air feels too hot — let's cool down.",
} as const;

const MOLD_TOOLTIPS = {
  "at-risk": "Air is wet — tiny mold can grow. Open a window!",
  ok: "Air is dry — mold is napping.",
} as const;

const DRY_TOOLTIPS = {
  "at-risk": "Air is very dry — lips may feel chapped. Drink water!",
  ok: "Air has enough water — comfy to breathe.",
} as const;

const CONDENSATION_TOOLTIPS = {
  high: "Water may appear on windows — like a cold drink!",
  ok: "Windows will stay dry — no water drops.",
} as const;

function getComfortTooltipKey(comfort: ComfortResult): keyof typeof COMFORT_TOOLTIPS {
  if (comfort.status === "good") return "good";
  if (comfort.status === "warning") return "warning";
  if (comfort.reason.includes("cold")) return "cold";
  return "hot";
}

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

  const moldStatus = moldRisk(humidity, depression);
  const dryStatus = dryAirRisk(humidity);
  const condensationStatus = condensationRisk(depression);

  const comfortTooltip = COMFORT_TOOLTIPS[getComfortTooltipKey(comfort)];
  const moldTooltip = MOLD_TOOLTIPS[moldStatus];
  const dryTooltip = DRY_TOOLTIPS[dryStatus];
  const condensationTooltip = CONDENSATION_TOOLTIPS[condensationStatus];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-5 gap-4">
        <RoomTemperatureWidgetPure temperature={temperature} humidity={humidity} pressure={pressure} />
        <Card className="aspect-3/1.2">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center gap-1.5">
              Comfort
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p>{comfortTooltip}</p>
                </TooltipContent>
              </Tooltip>
            </CardDescription>
            <CardTitle className="text-base capitalize">{comfort.status}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 text-xs text-muted-foreground">{comfort.reason}</CardContent>
        </Card>
        <Card className="aspect-3/1.2">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center gap-1.5">
              Mold
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p>{moldTooltip}</p>
                </TooltipContent>
              </Tooltip>
            </CardDescription>
            <CardTitle className="text-base">{moldStatus}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 text-xs text-muted-foreground">RH&gt;60% or depression&lt;3°C</CardContent>
        </Card>
        <Card className="aspect-3/1.2">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center gap-1.5">
              Dry air
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p>{dryTooltip}</p>
                </TooltipContent>
              </Tooltip>
            </CardDescription>
            <CardTitle className="text-base">{dryStatus}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="aspect-3/1.2">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center gap-1.5">
              Condensation
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p>{condensationTooltip}</p>
                </TooltipContent>
              </Tooltip>
            </CardDescription>
            <CardTitle className="text-base">{condensationStatus}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 text-xs text-muted-foreground">depression {depression.toFixed(1)}°C · Td {dewPointValue.toFixed(1)}°C</CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
