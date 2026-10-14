"use client";

import { useQuery } from "convex/react";
import { capitalize } from "effect/String";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { comfortZone, dewPoint, dewPointDepression } from "@/lib/environment";
import { getColor } from "@/lib/temperature-colors";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

type Props = {
  roomId?: string;
  className?: string;
};

function FlipValue({ value }: { value: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <span className="inline-flex overflow-hidden align-baseline">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: "60%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "-60%", opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="inline-block"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
    </MotionConfig>
  );
}

// Standalone copy of RoomTemperatureWidgetPure markup — fetches its own data
// so upcoming structural changes to either file stay independent.
export function RoomEnvironmentWidget({ roomId = "all", className }: Props) {
  // Fixed once per mount so the strip window doesn't shift on every render.
  const [asOf] = useState(() => Date.now());
  const liveBucket = useQuery(api.roomMetrics.getLiveReading, { roomId });
  const strip = useQuery(api.roomMetrics.getLast7DaysStrip, {
    roomId,
    asOf,
  });

  if (liveBucket === undefined || strip === undefined) {
    return <Skeleton className={cn("h-[140px]", className)} />;
  }

  if (liveBucket === null) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
          <CardDescription>No readings yet — waiting for sensor data</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const temperature = liveBucket.avgTemperature;
  const humidity = liveBucket.avgHumidity;

  const td = dewPoint(temperature, humidity);
  const dep = dewPointDepression(temperature, td);
  const comfort = comfortZone(temperature, humidity);

  const dotClass =
    comfort.status === "good"
      ? "bg-green-500"
      : comfort.status === "warning"
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <Card className={className}>
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {capitalize(comfort.reason)}
          </span>
          <span
            className={cn("h-2 w-2 rounded-full", dotClass)}
            aria-label={comfort.status}
          />
        </div>

        <div className="flex gap-4 divide-x">
          <div className="flex flex-col flex-1">
            <span className="text-2xl font-semibold">
              <FlipValue
                value={`${(Math.round(temperature * 10) / 10).toFixed(1)}°C`}
              />
            </span>

            <span className="text-xs text-muted-foreground">
              Temp · {dep.toFixed(1)}° dep
            </span>
          </div>

          <div className="flex flex-col flex-1">
            <span className="text-2xl font-semibold">
              <FlipValue value={`${Math.round(humidity)}%`} />
            </span>
            <span className="text-xs text-muted-foreground">Humidity</span>
          </div>
        </div>

        <div className="flex gap-2 mt-4" aria-label="Last 7 days">
          {strip.map(
            ({ date, avgTemperature, minTemperature, maxTemperature, count }) => {
              const tooltip =
                avgTemperature !== null
                  ? `Avg ${avgTemperature.toFixed(1)}°C · ${minTemperature!.toFixed(1)}–${maxTemperature!.toFixed(1)}°C · ${count} readings on ${date}`
                  : `No data ${date}`;
              return avgTemperature !== null ? (
                <span
                  key={date}
                  title={tooltip}
                  aria-label={tooltip}
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: getColor(avgTemperature) }}
                />
              ) : (
                <span
                  key={date}
                  title={tooltip}
                  aria-label={tooltip}
                  className="h-2.5 w-2.5 rounded-full border border-dashed border-muted-foreground/40"
                />
              );
            },
          )}
        </div>
      </CardContent>
    </Card>
  );
}
