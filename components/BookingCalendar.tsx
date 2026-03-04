"use client";
import { useBookingCalendarLogic } from "@/hooks/useBookingCalendarLogic";
import { Calendar } from "@demark-pro/react-booking-calendar";
import "@/app/booking.css";
import { BookingCalendarBox } from "@/app/account/active-bookings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addBusinessDays,
  addDays,
  addMonths,
  addWeeks,
  differenceInDays,
  formatDate,
  isMatch,
  isSameDay,
  subDays,
} from "date-fns";
import { start } from "effect/ScheduleIntervals";
import {
  ArrowRight,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import { If } from "./if";
import { Button } from "./ui/button";

const components = {
  MonthArrowBack: (props) => {
    console.log(props);

    return (
      <button
        {...props.innerProps}
        type="button"
        className="w-[14.2857%] flex justify-center h-[50px] items-center"
      >
        <div className="flex aspect-square w-10 items-center justify-center border rounded-full">
          <ChevronLeft strokeWidth={1} />
        </div>
      </button>
    );
  },
  MonthArrowNext: (props) => (
    <button
      {...props.innerProps}
      type="button"
      className="w-[14.2857%]  flex justify-center h-[50px] items-center"
    >
      <div className="flex aspect-square w-10 items-center justify-center border rounded-full">
        <ChevronRight strokeWidth={1} />
      </div>
    </button>
  ),
};

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

      <div className="flex flex-col gap-4">
        <p className="font-normal text-sm text-gray-900">Reservation Period</p>

        {selectedDate && (
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
        )}

        {selectedDate && (
          <BookingPeriod date={selectedDate} period={timePeriodString} />
        )}

        {!selectedDate && (
          <div className="text-center py-8">
            <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Select a date to continue</p>
          </div>
        )}
      </div>

      <div className="w-full mt-4 mb-6">
        <Button
          variant={"default"}
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

export function RangePreview({
  selectedDate,
  endDate,
  handleChangeDate,
}: {
  selectedDate: Date;
  endDate: Date;
  handleChangeDate: () => void;
}) {
  const opening_hour = "09:00am";
  const closing_hour = "05:00pm";

  if (isSameDay(selectedDate, endDate)) {
    return (
      <div className="border-gray-200 border rounded-lg p-4 flex gap-3">
        <div className="pt-2.5">
          <svg
            width="9"
            height="110"
            viewBox="0 0 9 110"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="4.5" cy="4" r="4" className="fill-muted-foreground" />
            <path
              d="M4.5 8L4.5 102"
              strokeDasharray="2 2"
              className="stroke-muted-foreground"
            />
            <circle cx="4.5" cy="106" r="4" className="fill-muted-foreground" />
          </svg>
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <h5 className="text-base font-bold">{opening_hour}</h5>
            <p className="opacity-70">{selectedDate.toDateString()}</p>
          </div>
          <div>
            <h5 className="text-base font-bold">05:00pm</h5>
            <p className="opacity-70">{endDate?.toDateString()}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-gray-200 border rounded-lg p-4 flex gap-3">
      <div className="flex flex-col gap-6 w-full">
        <div className="flex gap-x-3 tabular-nums items-start">
          <BookingCalendarBox startDate={selectedDate} />
          <div className="text-sm">
            <h5 className="text-black">
              {opening_hour} — {closing_hour}
            </h5>
            <p className="text-muted-foreground">Day Plan</p>
          </div>
        </div>
        <div className="border-t flex justify-end items-center relative border-gray-200 w-full">
          <Button
            variant={"outline"}
            className="absolute top-0 -translate-y-1/2"
            onClick={handleChangeDate}
          >
            Adjust
            <SlidersHorizontal strokeWidth={1} size="1.5em" />
          </Button>
        </div>
        <div className="flex gap-x-3 tabular-nums items-start">
          <BookingCalendarBox startDate={endDate} />
          <div className="text-sm">
            <h5 className="text-black">
              {opening_hour} — {closing_hour}
            </h5>
            <p className="text-muted-foreground">Day Plan</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BookingPeriod({
  date: selectedDate,
  period: timePeriodString,
}: {
  date: Date;
  period: string;
}) {
  const [start_time, end_time]: [Date, Date] =
    timePeriodString === "day"
      ? [selectedDate, selectedDate]
      : timePeriodString === "week"
        ? [selectedDate, subDays(addWeeks(selectedDate, 1), 1)]
        : [selectedDate, addMonths(selectedDate, 1)];

  return (
    <RangePreviewSimple startDate={start_time} endDate={end_time} />
  );
}

export function RangePreviewSimple({ startDate, endDate }: { startDate: Date, endDate: Date }) {
  const is_same_day = isSameDay(startDate, endDate);

  return <div className="flex flex-col gap-1">
    <div className="text-base font-medium text-foreground flex gap-2 items-center">
      <div>{formatDate(startDate, "dd MMM")}</div>
      <If cond={!is_same_day}>
        <ArrowRight strokeWidth={1} size={14} />
        <div>{formatDate(endDate, "dd MMM, yyyy")}</div>
      </If>
    </div>

    <p className="text-foreground text-sm">
      Booking for{" "}
      <span className="text-foreground">
        {is_same_day
          ? "1 day"
          : <>{differenceInDays(endDate, startDate)} days</>}
      </span>
    </p>
  </div>
}

function addWeekOpeningDays(date: Date): Date {
  let resultDate = new Date(date); // Create a copy of the original date
  let nonSundayDaysAdded = 0;
  let safetyCounter = 0;
  const MAX_CALENDAR_DAYS_TO_CHECK = 14; // A safety limit to prevent infinite loops

  while (nonSundayDaysAdded < 7 && safetyCounter < MAX_CALENDAR_DAYS_TO_CHECK) {
    resultDate = addDays(resultDate, 1); // Add one calendar day
    safetyCounter++;

    // getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday
    if (resultDate.getDay() !== 0) {
      // If the current day is not a Sunday
      nonSundayDaysAdded++;
    }
  }
  return resultDate;
}

export default BookingCalendar;
