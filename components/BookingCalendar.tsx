"use client";
import { addMonths, addWeeks, subDays } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBookingCalendarLogic } from "@/hooks/useBookingCalendarLogic";
import { RangePreviewSimple } from "./RangePreview";
import { Button } from "./ui/button";

const BookingCalendar = () => {
  const {
    reserved,
    selectedDate,
    handleDateChange,
    timePeriodString,
    planKey,
    reservablePlans,
    handleTimePeriodChange,
    handleProceed,
  } = useBookingCalendarLogic();

  return (
    <div>
      <Calendar
        mode="single"
        selected={selectedDate ?? undefined}
        // rdp only calls onSelect for days that its `disabled` matcher allows.
        onSelect={(date) => handleDateChange(date ? [date] : [])}
        disabled={reserved.map(({ startDate }) => startDate)}
        modifiers={{ weekend: { dayOfWeek: [0] } }}
        modifiersClassNames={{ weekend: "text-muted-foreground" }}
        className="w-full"
      />

      <div className="flex gap-6 mt-4 mb-6 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-primary rounded" />
          <span className="text-sm text-muted-foreground">Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-muted border border-border rounded" />
          <span className="text-sm text-muted-foreground">Fully Booked</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 border border-border rounded" />
          <span className="text-sm text-muted-foreground">Available</span>
        </div>
      </div>

      <div className="my-8 h-px bg-gradient-to-l from-transparent via-border to-transparent w-full" />

      <div className="flex flex-col gap-4">
        {selectedDate && (
          <>
            <p className="font-normal text-sm text-foreground">
              Reservation Period
            </p>

            <Select
              value={planKey ?? ""}
              onValueChange={handleTimePeriodChange}
            >
              <SelectTrigger className="w-full bg-background cursor-pointer">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                {reservablePlans.map((plan) => (
                  <SelectItem key={plan.key} value={plan.key}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <BookingPeriod date={selectedDate} period={timePeriodString} />
          </>
        )}

        {!selectedDate && (
          <div className="text-center py-8">
            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Select a date to continue</p>
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
        : timePeriodString === "calendar_month"
          ? [selectedDate, addMonths(selectedDate, 1)]
          : [selectedDate, addMonths(selectedDate, 1)];

  return (
    <div className="flex gap-3 items-start">
      <div className="w-8 h-8 flex items-center justify-center">
        <CalendarIcon className="text-muted-foreground" />
      </div>

      <RangePreviewSimple startDate={start_time} endDate={end_time} />
    </div>
  );
}

export default BookingCalendar;
