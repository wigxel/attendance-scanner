"use client";
import React, { useState } from "react";
import { calculateEndDate } from "@/lib/utils";

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

const BookingCalendar = ({
  onProceed,
}: {
  onProceed: (
    date: Date,
    endDate: Date,
    price: number,
    timePeriod: "day" | "week" | "month",
  ) => void;
}) => {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [timePeriodString, setTimePeriodString] = useState<string>("day");

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
    throw Error("Invalid time period");
  }

  // const oneDay = 86400000;

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

  return (
    <div>
      <Calendar
        selected={selectedDates}
        reserved={reserved}
        // @ts-expect-error set selected dates
        onChange={setSelectedDates}
        disabled={(date) => date.getDay() === 0}
        protection={true}
        range={false}
      />

      {/* Date Indicators */}
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

      {selectedDates.length > 0 && (
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
                {selectedDates.map((date, index) => (
                  <div key={index}>{formatDate(date)}</div>
                ))}
              </div>
            </div>
            <button
              onClick={() =>
                onProceed(
                  selectedDates[0],
                  calculateEndDate(selectedDates[0], timePeriod),
                  price,
                  timePeriodString,
                )
              }
              className="px-6 py-2 bg-[#0000FF] text-white rounded-lg font-medium hover:bg-blue-600 transition-colors cursor-pointer"
            >
              Proceed
            </button>
          </div>
        </div>
      )}

      {selectedDates.length === 0 && (
        <div className="text-center py-8">
          <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Select one or more dates to continue</p>
        </div>
      )}
    </div>
  );
};

export default BookingCalendar;
