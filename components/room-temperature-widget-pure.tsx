"use client";

import { capitalize } from "effect/String";
import { comfortZone, dewPoint, dewPointDepression } from "@/lib/environment";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "./ui/card";

type Props = {
  temperature: number;
  humidity: number;
  pressure?: number;
  className?: string;
};

// functional — no hooks, no Effects, pure render from props
export function RoomTemperatureWidgetPure({
  temperature,
  humidity,
  pressure,
  className,
}: Props) {
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
              {Math.round(temperature * 10) / 10}°C
            </span>

            <span className="text-xs text-muted-foreground">
              Temp · {dep.toFixed(1)}° dep
            </span>
          </div>

          <div className="flex flex-col flex-1">
            <span className="text-2xl font-semibold">
              {Math.round(humidity)}%
            </span>
            <span className="text-xs text-muted-foreground">Humidity</span>
          </div>
        </div>

        <p className="flex gap-2 mt-4 text-muted-foreground items-center text-xs">
          <span>Pressure — </span>

          {pressure !== undefined && (
            <span className="text-foreground">{Math.round(pressure)} hPa</span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
