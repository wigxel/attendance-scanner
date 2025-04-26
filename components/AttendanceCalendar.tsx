"use client"
import React from "react";
import { DateCalendar } from "./DateCalendar";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, InfoIcon } from "lucide-react";
import { createStore, useStore } from 'zustand'
import { addDays, addMonths, format, formatISO, parseISO } from "date-fns";
import { useProfile } from "@/hooks/auth";

interface StoreState {
  month: Date;
  setMonth: (month: Date) => void;
}

const store = createStore<StoreState>((setter) => ({
  month: new Date(),
  setMonth: (month: Date) => {
    setter({ month });
  },
}))

export function AttendanceCalendar() {
  const { setMonth, month } = useStore(store)

  // Fetch attendance data for the selected month
  const attendanceDays = useAttendanceList();
  const parsed_dates = attendanceDays.map((record) => parseISO(record.timestamp));


  return (
    <section className="space-y-4">
      <DateCalendar
        days={parsed_dates} month={month}
        setMonth={setMonth} />

      <p className="text-sm inline-flex gap-2 items-start">
        <InfoIcon size={18} className="opacity-50" />
        <span>
          You are {20 - attendanceDays.length} days away from getting <span>2 days</span> free this month
        </span>
      </p>
    </section>
  )
}

function useAttendanceList() {
  const { month } = useStore(store)
  const profile = useProfile();

  return useQuery(api.myFunctions.getAttendanceByMonth, {
    userId: profile?.id,
    start: formatISO(addDays(addMonths(month, -1), 1)),
    end: formatISO(addDays(addMonths(month, 1), -1)),
  }) || [];
}

export function CalendarCaption() {
  const { month, setMonth } = useStore(store)
  const list = useAttendanceList();

  // Function to navigate to previous month
  const previousMonth = () => {
    const prevMonth = new Date(month);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setMonth(prevMonth);
  }

  // Function to navigate to next month
  const nextMonth = () => {
    const nextMonth = new Date(month);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setMonth(nextMonth);
  }


  return <>
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-medium flex gap-4 items-center">
        <span>{format(month, 'MMMM')} {" "}</span>
        <span className="opacity-50 text-sm font-mono">
          |
        </span>
        <span className="opacity-50 text-sm font-mono">
          {format_visits(list.length)}
        </span>
      </h2>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={previousMonth}
          className="h-8 w-8 rounded-full"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={nextMonth}
          className="h-8 w-8 rounded-full"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
    <div className="border-b -mx-3" />
  </>
}

function format_visits(count: number) {
  if (count === 0) return "zero visits"

  return `${String(count).padStart(2, "0")} visits`
}
