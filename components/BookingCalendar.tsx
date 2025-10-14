"use client";
import { useBookingCalendarLogic } from "@/hooks/useBookingCalendarLogic";

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
  const {
    reserved,
    selectedDate,
    handleDateChange,
    formatDate,
    timePeriodString,
    handleTimePeriodChange,
    handleProceed,
  } = useBookingCalendarLogic();

  return (
    <div>
      <Calendar
        selected={selectedDate ? [selectedDate] : []}
        reserved={reserved}
        // @ts-expect-error set selected dates
        onChange={handleDateChange}
        protection={true}
        range={false}
      />

      <div className="flex gap-6 mt-4 mb-6">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-black rounded"></div>
          <span className="text-sm text-gray-600">Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-100 border rounded"></div>
          <span className="text-sm text-gray-600">Fully Booked</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 border border-gray-300 rounded"></div>
          <span className="text-sm text-gray-600">Available</span>
        </div>
      </div>

      {selectedDate && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="mb-6">
            <Select
              value={timePeriodString}
              onValueChange={handleTimePeriodChange}
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
