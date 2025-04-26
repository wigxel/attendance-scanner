"use client"

import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface DateCalendarProps {
  days: Date[]
  month: Date
  setMonth: (a: Date) => void;
  className?: string
}

export function DateCalendar({ className, days = [], month, setMonth }: DateCalendarProps) {

  return (
    <div className={cn("flex border bg-background rounded-2xl items-center justify-center space-x-4", className)}>
      <Calendar
        mode="single"
        selected={days}

        // onSelect={setDate}
        month={month}
        onMonthChange={setMonth}
        className="p-3 w-full"
      />
    </div>
  )
}
