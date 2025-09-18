"use client";
import React, { useState } from "react";
import { Calendar } from "@demark-pro/react-booking-calendar";
import "@demark-pro/react-booking-calendar/dist/react-booking-calendar.css";
import { Calendar as CalendarIcon } from "lucide-react";

const BookingCalendar = () => {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  const oneDay = 86400000;
  const today = new Date().getTime() + oneDay;

  const reserved = Array.from({ length: 1 }, (_, i) => {
    const daysCount = 0;
    const startDate = new Date(today + oneDay * 8 * i);

    return {
      startDate,
      endDate: new Date(startDate.getTime() + oneDay * daysCount),
    };
  });

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
      />

      {/* Date Indicators */}
      <div className="flex gap-6 mt-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-black rounded"></div>
          <span className="text-sm text-gray-600">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 border rounded"></div>
          <span className="text-sm text-gray-600">Reserved/Unavailable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-gray-300 rounded"></div>
          <span className="text-sm text-gray-600">Available</span>
        </div>
      </div>

      {selectedDates.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">
                Selected Date ({selectedDates.length}):
              </p>
              <div className="text-sm text-gray-600 mt-1">
                {selectedDates.map((date, index) => (
                  <div key={index}>{formatDate(date)}</div>
                ))}
              </div>
            </div>
            <button className="px-6 py-2 bg-[#0000FF] text-white rounded-lg font-medium hover:bg-blue-600 transition-colors">
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
