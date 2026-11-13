"use client";

import {
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type MetricsRange = { start: string; end: string };

type MetricsDateRangeProps = {
  /** Null means all time: no filter applied. */
  value: MetricsRange | null;
  onChange: (value: MetricsRange | null) => void;
  /** Hide the "All time" preset, for tables whose null value means something else. */
  allowAllTime?: boolean;
};

function labelFor(value: MetricsRange): string {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");

  if (value.start === today && value.end === today) return "Today";

  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  if (value.start === weekStart && value.end === today) return "This week";

  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
  if (value.start === monthStart && value.end === monthEnd) return "This month";

  return `${format(parseISO(value.start), "MMM d")} – ${format(
    parseISO(value.end),
    "MMM d, yyyy",
  )}`;
}

export function MetricsDateRange({
  value,
  onChange,
  allowAllTime = true,
}: MetricsDateRangeProps) {
  const [open, setOpen] = useState(false);

  const showToday = () => {
    const day = format(new Date(), "yyyy-MM-dd");
    onChange({ start: day, end: day });
  };

  const showThisWeek = () => {
    const now = new Date();
    onChange({
      start: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      end: format(now, "yyyy-MM-dd"),
    });
  };

  const showThisMonth = () => {
    const now = new Date();
    onChange({
      start: format(startOfMonth(now), "yyyy-MM-dd"),
      end: format(endOfMonth(now), "yyyy-MM-dd"),
    });
  };

  const handleSelect = (next: DateRange | undefined) => {
    if (!next?.from) return;

    onChange({
      start: format(next.from, "yyyy-MM-dd"),
      end: format(next.to ?? next.from, "yyyy-MM-dd"),
    });

    if (next.to) setOpen(false);
  };

  const label = value ? labelFor(value) : "All time";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" aria-label={`Date range: ${label}`}>
          <CalendarIcon className="h-4 w-4" />
          {label}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex items-center gap-1 border-b p-2">
          {allowAllTime && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              aria-pressed={value === null}
            >
              All time
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={showToday}>
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={showThisWeek}>
            This week
          </Button>
          <Button variant="ghost" size="sm" onClick={showThisMonth}>
            This month
          </Button>
        </div>
        <Calendar
          mode="range"
          selected={
            value
              ? { from: parseISO(value.start), to: parseISO(value.end) }
              : undefined
          }
          onSelect={handleSelect}
          numberOfMonths={1}
        />
      </PopoverContent>
    </Popover>
  );
}
