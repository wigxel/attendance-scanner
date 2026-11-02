"use client";
import { differenceInDays, formatDate, isSameDay } from "date-fns";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { BookingCalendarBox } from "@/app/account/active-bookings";
import { cn } from "@/lib/utils";
import { If } from "./if";
import { Button } from "./ui/button";

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
      <div className="border-border border rounded-lg p-4 flex gap-3">
        <div className="pt-2.5">
          <svg
            aria-hidden="true"
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
    <div className="border-border border rounded-lg p-4 flex gap-3">
      <div className="flex flex-col gap-6 w-full">
        <div className="flex gap-x-3 tabular-nums items-start">
          <BookingCalendarBox startDate={selectedDate} />
          <div className="text-sm">
            <h5 className="text-foreground">
              {opening_hour} — {closing_hour}
            </h5>
            <p className="text-muted-foreground">Day Plan</p>
          </div>
        </div>
        <div className="border-t flex justify-end items-center relative border-border w-full">
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
            <h5 className="text-foreground">
              {opening_hour} — {closing_hour}
            </h5>
            <p className="text-muted-foreground">Day Plan</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RangePreviewSimple({
  startDate,
  variant = "default",
  endDate,
}: {
  startDate: Date;
  endDate: Date;
  variant?: "default" | "sm";
}) {
  const is_same_day = isSameDay(startDate, endDate);

  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn("font-medium text-foreground flex gap-2 items-center", {
          "text-base ": variant === "default",
          "text-sm": variant === "sm",
        })}
      >
        <div>{formatDate(startDate, "dd MMM")}</div>
        <If cond={!is_same_day}>
          <ArrowRight strokeWidth={1} size={14} />
          <div>{formatDate(endDate, "dd MMM, yyyy")}</div>
        </If>
      </div>

      <p
        className={cn("text-foreground", {
          "text-sm": variant === "default",
          "text-xs": variant === "sm",
        })}
      >
        Booking for{" "}
        <span className="text-foreground">
          {is_same_day ? (
            "1 day"
          ) : (
            <>{differenceInDays(endDate, startDate)} days</>
          )}
        </span>
      </p>
    </div>
  );
}
