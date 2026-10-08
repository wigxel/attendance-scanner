"use client";

import { addDays, format, startOfWeek, subDays } from "date-fns";
import { range } from "effect/Array";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getColor, palette } from "@/lib/temperature-colors";

type DailyBucket = {
  date: string;
  avgTemperature: number;
  minTemperature: number;
  maxTemperature: number;
  count: number;
};

type Properties = {
  dailyBuckets: DailyBucket[];
};

export function TemperatureHeatmap({ dailyBuckets }: Properties) {
  const [selectedDay, setSelectedDay] = useState<DailyBucket | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = startOfWeek(subDays(today, 52 * 7), { weekStartsOn: 0 });

  const dailyMap = new Map(dailyBuckets.map((bucket) => [bucket.date, bucket]));

  const cells = Array.from({ length: 371 }, (_, cellIndex) => {
    const cellDate = addDays(startDate, cellIndex);
    const dateKey = format(cellDate, "yyyy-MM-dd");
    const bucket = dailyMap.get(dateKey) ?? null;
    const isFuture = cellDate > today;
    const temperature = isFuture ? null : (bucket?.avgTemperature ?? null);

    return { cellDate, dateKey, bucket, temperature, isFuture };
  });

  const monthLabels = (() => {
    const labels: Array<{ month: string; column: number }> = [];
    let lastMonth = "";
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
      const cell = cells[cellIndex];
      const month = format(cell.cellDate, "MMM");
      const column = Math.floor(cellIndex / 7);
      if (month !== lastMonth && cell.cellDate.getDay() === 0) {
        labels.push({ month, column });
        lastMonth = month;
      }
    }
    return labels;
  })();

  const rows = range(0, 52);

  return (
    <div className="flex flex-col gap-2">
      <table
        className="w-full border-separate"
        style={{ borderSpacing: "4px" }}
      >
        <thead>
          <tr>
            <th className="w-8" />
            {rows.map((columnIndex) => {
              const label = monthLabels.find(
                (monthLabel) => monthLabel.column === columnIndex,
              );
              return (
                <th
                  key={columnIndex}
                  className="text-xs h-5 font-normal text-muted-foreground/50 text-left relative"
                >
                  <span className="absolute top-0">{label?.month ?? ""}</span>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {range(0, 6).map((rowIndex) => {
            return (
              <tr key={rowIndex}>
                <th className="w-8 text-xs font-normal text-muted-foreground/50 text-left pr-1">
                  {rowIndex === 1
                    ? "Mon"
                    : rowIndex === 3
                      ? "Wed"
                      : rowIndex === 5
                        ? "Fri"
                        : ""}
                </th>

                {rows.map((columnIndex) => {
                  const cellIndex = columnIndex * 7 + rowIndex;
                  const cell = cells[cellIndex];
                  const backgroundColor = getColor(cell?.temperature);
                  const tooltip = cell?.bucket
                    ? `Avg ${cell.bucket.avgTemperature.toFixed(1)}°C · ${cell.bucket.minTemperature.toFixed(1)}–${cell.bucket.maxTemperature.toFixed(1)}°C · ${cell.bucket.count} readings on ${cell.dateKey}`
                    : cell?.isFuture
                      ? `Future ${cell.dateKey}`
                      : `No data ${cell.dateKey}`;

                  const showDetails = () =>
                    cell.bucket && setSelectedDay(cell.bucket);

                  return (
                    <td
                      key={cell.dateKey}
                      title={tooltip}
                      onClick={showDetails}
                      onKeyUp={showDetails}
                      aria-label={tooltip}
                      className="aspect-square rounded-sm w-3! rounded-[2px] border border-transparent hover:border-foreground/20 transition-colors"
                      style={{ background: backgroundColor }}
                    >
                      <div className="aspect-square w-full" />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>20°C</span>
        <div className="flex gap-[2px] flex-1 max-w-[80px]">
          {palette.map((color) => {
            return (
              <div
                key={color}
                className="h-3 flex-1 rounded-[2px]"
                style={{ background: color }}
              />
            );
          })}
        </div>
        <span>35°C</span>
        <span className="ml-2">Less</span>
        <div className="flex gap-[2px]">
          <div
            className="h-3 w-3 rounded-[2px]"
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
            }}
          />
        </div>
        <span>More</span>
      </div>

      <Dialog
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDay?.date}</DialogTitle>
          </DialogHeader>
          {selectedDay && (
            <div className="flex flex-col gap-2 text-sm">
              <div>Avg {selectedDay.avgTemperature.toFixed(1)}°C</div>
              <div>
                Min {selectedDay.minTemperature.toFixed(1)}°C — Max{" "}
                {selectedDay.maxTemperature.toFixed(1)}°C
              </div>
              <div>{selectedDay.count} readings</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
