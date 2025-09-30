"use client";
import React from "react";
import { calculateEndDate } from "@/lib/utils";
import {
  useBookingStore,
  setSelectedDate,
  setTimePeriodString,
  setEndDate,
  setPrice,
  setActiveTab,
} from "@/app/reserve/store";

import { Calendar } from "@demark-pro/react-booking-calendar";
import "@demark-pro/react-booking-calendar/dist/react-booking-calendar.css";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BookingCalendar = () => {
  const { selectedDate, timePeriodString } = useBookingStore();

  let timePeriod: number;
  let price: number; // in kobo

  if (timePeriodString === "day") {
    timePeriod = 1;
    price = 150000; // 1,500
  } else if (timePeriodString === "week") {
    timePeriod = 7;
    price = 600000; // 6,000
  } else if (timePeriodString === "month") {
    timePeriod = 24;
    price = 2400000; // 24,000
  } else {
    throw new Error("Invalid time period");
  }

  const reserved: {
    startDate: Date;
    endDate: Date;
  }[] = [];

  const formatDate = (date: Date): string => {
    if (!date) {
      return "";
    }
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleProceed = () => {
    if (!selectedDate) return;

    const pickedDate = selectedDate;

    if (pickedDate.getDay() === 0) {
      alert("Please select another date. We're closed on Sundays");
    } else {
      const calculatedEndDate = calculateEndDate(selectedDate, timePeriod);

      setEndDate(calculatedEndDate);
      setPrice(price);
      setActiveTab("choose");
    }
  };

  return (
    <div>
      <Calendar
        selected={selectedDate ? [selectedDate] : []}
        reserved={reserved}
        // @ts-expect-error set selected dates
        onChange={(dates: Date[]) => setSelectedDate(dates[0] || null)}
        protection={true}
        range={false}
      />

      <div className="flex gap-6 mt-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-black rounded"></div>
          <span className="text-sm text-gray-600">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 border rounded"></div>
          <span className="text-sm text-gray-600">Fully Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-gray-300 rounded"></div>
          <span className="text-sm text-gray-600">Available</span>
        </div>
      </div>

      {selectedDate && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="mb-6">
            <Select
              value={timePeriodString}
              onValueChange={setTimePeriodString}
            >
              <SelectTrigger className="w-full bg-white cursor-pointer">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Selected Date:</p>
              <div className="text-sm text-gray-600 mt-1">
                <div>{formatDate(selectedDate)}</div>
              </div>
            </div>
            <button
              onClick={handleProceed}
              className="px-6 py-2 bg-[#0000FF] text-white rounded-lg font-medium hover:bg-blue-600 transition-colors cursor-pointer"
            >
              Proceed
            </button>
          </div>
        </div>
      )}

      {!selectedDate && (
        <div className="text-center py-8">
          <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Select a date to continue</p>
        </div>
      )}
    </div>
  );
};

export default BookingCalendar;
