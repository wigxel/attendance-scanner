"use client";

import { useQuery } from "convex/react";
import { capitalize } from "effect/String";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import {
  type ComfortStatus,
  comfortZone,
  dewPoint,
  dewPointDepression,
} from "@/lib/environment";
import { getColor } from "@/lib/temperature-colors";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Skeleton } from "./ui/skeleton";

type Props = {
  roomId?: string;
  className?: string;
};

const STATUS_DOT_CLASS: Record<ComfortStatus, string> = {
  good: "bg-green-500",
  warning: "bg-yellow-500",
  bad: "bg-red-500",
};

const STATUS_TEXT_CLASS: Record<ComfortStatus, string> = {
  good: "text-green-500",
  warning: "text-yellow-500",
  bad: "text-red-500",
};

const STRIP_DOT_CLASS = "h-2.5 w-2.5 rounded-full";
const EMPTY_STRIP_DOT_CLASS = `${STRIP_DOT_CLASS} border border-dashed border-muted-foreground/40`;

// Standalone copy of RoomTemperatureWidgetPure markup — fetches its own data
// so upcoming structural changes to either file stay independent.
export function RoomEnvironmentWidget({ roomId = "all", className }: Props) {
  // Fixed once per mount so the strip window doesn't shift on every render.
  const [asOf] = useState(() => Date.now());
  const liveReading = useQuery(api.roomMetrics.getRawReading, { roomId });
  const strip = useQuery(api.roomMetrics.getLast7DaysStrip, {
    roomId,
    asOf,
  });

  if (liveReading === undefined || strip === undefined) {
    return <Skeleton className={cn("h-[140px]", className)} />;
  }

  if (liveReading === null) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Co-working Live Air Quality</CardTitle>
          <CardDescription>
            No readings yet — waiting for sensor data
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const temperature = liveReading.temperature;
  const humidity = liveReading.humidity;

  const dewTemperature = dewPoint(temperature, humidity);
  const depression = dewPointDepression(temperature, dewTemperature);
  const comfort = comfortZone(temperature, humidity);

  const temperatureLabel = `${(Math.round(temperature * 10) / 10).toFixed(1)}°C`;
  const humidityLabel = `${Math.round(humidity)}%`;

  return (
    <Card className={className}>
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">
            Co-working Live Air Quality
          </span>

          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                STATUS_DOT_CLASS[comfort.status],
              )}
            />
            <span
              className={cn(
                "text-xs font-medium",
                STATUS_TEXT_CLASS[comfort.status],
              )}
            >
              {capitalize(comfort.reason)}
            </span>
          </div>
        </div>

        <div className="flex gap-4 divide-x">
          <div className="flex flex-col flex-1">
            <span className="text-4xl font-semibold">
              <FlipValue value={temperatureLabel} />
            </span>

            <span className="text-xs text-muted-foreground">
              Temp · {depression.toFixed(1)}° dep
            </span>
          </div>

          <div className="flex flex-col flex-1">
            <span className="text-4xl font-semibold">
              <FlipValue value={humidityLabel} />
            </span>
            <span className="text-xs text-muted-foreground">Humidity</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {strip.map(
              ({
                date,
                avgTemperature,
                minTemperature,
                maxTemperature,
                count,
              }) => {
                const tooltip =
                  avgTemperature !== null &&
                  minTemperature !== null &&
                  maxTemperature !== null
                    ? `Avg ${avgTemperature.toFixed(1)}°C · ${minTemperature.toFixed(1)}–${maxTemperature.toFixed(1)}°C · ${count} readings on ${date}`
                    : `No data ${date}`;

                return (
                  <span
                    key={date}
                    role="img"
                    title={tooltip}
                    aria-label={tooltip}
                    className={
                      avgTemperature !== null
                        ? STRIP_DOT_CLASS
                        : EMPTY_STRIP_DOT_CLASS
                    }
                    style={
                      avgTemperature !== null
                        ? { background: getColor(avgTemperature) }
                        : undefined
                    }
                  />
                );
              },
            )}
          </div>

          <span className="text-xs text-muted-foreground">Last 7 days</span>
        </div>
      </CardContent>
    </Card>
  );
}

type FlipValueProps = {
  value: string;
};

function FlipValue({ value }: FlipValueProps) {
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
