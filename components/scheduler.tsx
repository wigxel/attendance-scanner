"use client"
import React, { useState } from "react";
import { type DateRange, DayPicker } from "react-day-picker";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Minus,
  Plus,
  UsersRound,
} from "lucide-react";
import { useForm } from "react-hook-form";
import RadioFilterComponent from "./filter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFormErrorToast } from "@/app/reservationScheduler/shared";

interface SchedulerComponentProps {
  defaultValues?: {
    duration: string;
    numberOfSeats: number;
    availableSeats: number;
    selectedDate: DateRange | undefined;
  };
  onSubmit: (formData: {
    duration: string;
    numberOfSeats: number;
    selectedDate: DateRange;
  }) => void;
}

const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d\s*-\s*([01]?\d|2[0-3]):[0-5]\d$/;

const timeData = [
  { label: "8:00 - 9:00", value: "8:00 - 9:00" },
  { label: "9:00 - 10:00", value: "9:00 - 10:00" },
  { label: "10:00 - 11:00", value: "10:00 - 11:00" },
  { label: "11:00 - 12:00", value: "11:00 - 12:00" },
  { label: "12:00 - 13:00", value: "12:00 - 13:00" },
  { label: "13:00 - 14:00", value: "13:00 - 14:00" },
  { label: "14:00 - 15:00", value: "14:00 - 15:00" },
  { label: "15:00 - 16:00", value: "15:00 - 16:00" },
  { label: "16:00 - 17:00", value: "16:00 - 17:00" },
];

// filter
const dateFilterOptions = [
  { id: "dateReserved", checker: "dateReserved", label: "Reserved" },
  { id: "dateSelected", checker: "dateSelected", label: "Selected" },
  { id: "dateAvailable", checker: "dateAvailable", label: "Available" },
];

const timeFilterOptions = [
  { id: "timeReserved", checker: "timeReserved", label: "Reserved" },
  { id: "timeSelected", checker: "timeSelected", label: "Selected" },
  { id: "timeAvailable", checker: "timeAvailable", label: "Available" },
];

const schema = z.object({
  duration: z.string().refine(e => {
    return e === 'allDay' || timeRegex.test(e)
  }, {
    message: "An invalid duration was provided"
  }),
  numberOfSeats: z.number().min(1, { message: "A minimum of one seat is required" }),
  availableSeats: z.number().min(0, { message: "Available seats cannot be negative" }),
  selectedDate: z.object({
    from: z.date().nullish(),
    to: z.date().nullish()
  })
})

export function SchedulerForm({ defaultValues, onSubmit: doSubmit }: SchedulerComponentProps) {
  const [dateFilter, setDateFilter] = useState("dateAvailable");
  const availableSeats = defaultValues?.availableSeats ?? 0;

  const form = useForm<NonNullable<SchedulerComponentProps["defaultValues"]>>({
    defaultValues: {
      numberOfSeats: 0,
      duration: "allDay",
      selectedDate: { from: undefined, to: undefined },
      ...defaultValues
    },
    // @ts-expect-error Nothing
    resolver: zodResolver(schema),
  });

  const numberOfSeats = form.watch("numberOfSeats");

  // confirms that all necessary fields are filled before loading the next component
  // fields date, number of seats, time
  const onSubmit = form.handleSubmit((data) => {
    doSubmit(data)
  });

  useFormErrorToast(form);

  return (
    <form
      className="w-full h-fit gap-4 flex flex-col justify-center items-center p-4 xl:p-0 mt-38 xl:mt-18"
      onSubmit={onSubmit}
    >
      <div className="w-[335px] sm:max-w-[335px] h-[330px] sm:max-h-[330px] p-4 flex flex-col bg-(--background-gray) rounded-lg">
        {/* date filter */}
        <div className="flex items-center justify-between">
          <span className="text-(--text-gray) text-xs font-medium flex items-center">
            <Calendar className="w-4 h-4 mr-0.5" />
            Choose Date
          </span>

          <div className="flex justify-evenly items-center">
            {dateFilterOptions.map((item) => (
              <RadioFilterComponent
                key={item.id}
                id={item.id}
                label={item.label}
                name="dateFilter"
                value={item.checker}
                checker={dateFilter}
                onChange={setDateFilter}
              />
            ))}
          </div>
        </div>

        {/* date picker*/}
        <div className="w-full h-full">
          <input type="hidden"
            {...form.register("selectedDate")}
          />
          <DayPicker
            mode="range"
            selected={form.watch('selectedDate')}
            onSelect={(date) => {
              form.setValue("selectedDate", date);
            }}
            classNames={{
              day_selected: `!bg-(--primary) !text-white !rounded-sm`,
              day_disabled: `!bg-(--text-gray) !rounded-sm !border !border-(--primary)`,
              day: `hover:!rounded-sm w-8 h-8 hover:!bg-gray-200`,
            }}
          />
        </div>
      </div>

      {/* number of seats */}
      <div className="w-full flex justify-between items-center bg-(--background-gray) rounded-md p-3">
        <div className="flex flex-col items-center">
          <span className="flex justify-start items-center text-xs text-(--text-gray)">
            <UsersRound className="w-6 h-4" />
            Choose Number of Seats
          </span>

          <span className="w-full text-[11px] text-(--text-gray) text-center">
            {availableSeats < 1 ? 0 : availableSeats - numberOfSeats} seats remaining
          </span>
        </div>

        <div className="flex items-center justify-between w-28 h-8 bg-(--background-gray) rounded-sm px-2">
          {/* number of seats */}

          {/* reduce number of seats */}
          <button
            type="button"
            disabled={!(numberOfSeats > 1) || availableSeats === 0}
            className="w-8 h-8 flex justify-center items-center text-(--text-gray) bg-(--button-gray) rounded-sm hover:bg-gray-200"
            onClick={(e) => {
              e.preventDefault();
              form.setValue('numberOfSeats', numberOfSeats - 1);
            }}
          >
            <Minus />
          </button>

          {/* display number of seats */}
          <span>{numberOfSeats}</span>

          {/* increment number of seats */}
          <button
            type="button"
            className="w-8 h-8 flex justify-center items-center text-(--text-gray) bg-(--button-gray) rounded-sm hover:bg-gray-200"
            disabled={!(numberOfSeats < availableSeats)}
            onClick={(e) => {
              e.preventDefault();
              form.setValue('numberOfSeats', numberOfSeats + 1);
            }}
          >
            <Plus />
          </button>
        </div>
      </div>

      {/* time */}
      <ChooseTime
        value={form.watch('duration')}
        onChange={(duration) => {
          form.setValue('duration', duration);
        }}
      />

      <button
        type="submit"
        className="w-full h-8 text-xs font-semibold bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm flex justify-center items-center"
      >
        Proceed
      </button>
    </form >
  );
}

function ChooseTime(props: { value: string, onChange: (duration: string) => void }) {
  // Reduce 4 states to a single state object
  const [state, setState] = useState({
    isOpen: false,
    isCustom: false,
    duration: "allDay",
    timeFilter: "timeAvailable",
  });

  const handleChange = (updates: Partial<typeof state>) => {
    if (updates.duration) {
      props.onChange(updates.duration)
    }

    setState((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="bg-(--background-gray) w-full rounded-md">
      <div className="h-[50px] relative flex items-center justify-between px-5">
        <span className="flex items-center text-xs text-(--text-gray)">
          <Clock className="w-4 h-4 mr-1" />
          Choose Time
        </span>

        <button
          type="button"
          className="w-8 h-8 flex justify-center items-center text-(--text-gray) bg-(--button-gray) rounded-sm hover:bg-gray-200"
          aria-label="Customise options"
          onClick={() => handleChange({ isOpen: !state.isOpen })}
        >
          {state.isOpen === false ? <ChevronDown /> : <ChevronUp />}
        </button>
      </div>

      <ul className="flex flex-col px-2 *:px-4">
        {/* time input selector option*/}
        <label
          htmlFor="input-ref"
          className="w-full h-[31px] rounded-sm group relative flex select-none justify-between items-center  hover:bg-(--button-gray) text-xs leading-none text-violet11 outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[disabled]:text-mauve8 data-[highlighted]:text-violet1"
        >
          All Day (9am - 5pm)
          {/* time input selector */}
          <input
            id="input-ref"
            type="radio"
            name="time_option"
            value="allDay"
            checked={!state.isCustom}
            onChange={() => {
              handleChange({ duration: "allDay", isCustom: false });
            }}
          />
        </label>

        <label
          htmlFor="input-ref2"
          className="w-full group flex flex-col relative h-fit select-none item-center text-xs leading-none text-violet11 outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[disabled]:text-mauve8 data-[highlighted]:text-violet1"
          onClick={(e) => {
            e.preventDefault();
            handleChange({ isCustom: true });
          }}
          onKeyUp={() => handleChange({ isCustom: true })}
        >
          <label className="w-full h-[31px] group relative select-none flex justify-between items-center hover:bg-(--button-gray) rounded-sm mb-4">
            <span className="text-xs">Custom</span>

            {/* time input selector */}
            <input
              id="input-ref2"
              type="radio"
              name="time_option"
              value="custom"
              checked={state.isCustom}
              onChange={() => {
                handleChange({ duration: "allDay", isCustom: false });
              }}
            />
          </label>

          {/* time filter */}
          <div
            className={
              state.isCustom === true
                ? "flex justify-end items-center mb-2 relative"
                : "hidden relative"
            }
          >
            {timeFilterOptions.map((item) => (
              <RadioFilterComponent
                key={item.id}
                id={item.id}
                label={item.label}
                name="timeFilter"
                value={item.checker}
                checker={state.timeFilter}
                onChange={(val) => handleChange({ timeFilter: val })}
              />
            ))}
          </div>

          <div className={state.isCustom ? "grid grid-cols-3 gap-1.5" : "hidden"}>
            {timeData.map((time) => (
              <button
                key={time.value}
                type="button"
                className={`border hover:border-(--primary) w-24 h-8 text-xs font-medium rounded-sm ${state.duration === time.value
                  ? "bg-(--primary) text-white"
                  : "bg-(--button-gray) rounded-sm"
                  }`}
                onClick={() => {
                  handleChange({ duration: time.value });
                }}
              >
                {time.label}
              </button>
            ))}
          </div>
        </label>
      </ul>
    </div>
  );
}
