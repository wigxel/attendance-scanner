"use client";
import { useBookingCalendarLogic } from "@/hooks/useBookingCalendarLogic";

import { Calendar } from "@demark-pro/react-booking-calendar";
import "@/app/booking.css";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

const components = {
  MonthArrowBack: (props) => {
    console.log(props)

    return (
      <button {...props.innerProps} type="button" className="w-[14.2857%] flex justify-center h-[50px] items-center">
        <div className="flex aspect-square w-10 items-center justify-center border rounded-full"><ChevronLeft strokeWidth={1} /></div>
      </button>
    );
  },
  MonthArrowNext: (props) => (
    <button {...props.innerProps} type="button" className="w-[14.2857%]  flex justify-center h-[50px] items-center">
      <div className="flex aspect-square w-10 items-center justify-center border rounded-full"><ChevronRight strokeWidth={1} /></div>
    </button>
  ),
}

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
        components={components}
      />

      <div className="flex gap-6 mt-4 mb-6 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-black rounded" />
          <span className="text-sm text-gray-600">Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-100 border rounded" />
          <span className="text-sm text-gray-600">Fully Booked</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 border border-gray-300 rounded" />
          <span className="text-sm text-gray-600">Available</span>
        </div>
      </div>

      <div className="my-8 h-px bg-gradient-to-l from-transparent via-gray-300 to-transparent w-full" />

      {selectedDate && (
        <div className="">
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
          </div>
        </div>
      )}

      {!selectedDate && (
        <div className="text-center py-8">
          <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Select a date to continue</p>
        </div>
      )}

      <div className="w-full mt-4 mb-6">
        <Button
          variant={'default'}
          size="lg"
          className="w-full"
          onClick={handleProceed}
        >
          Proceed
        </Button>
      </div>
    </div>
  );
};

export default BookingCalendar;
