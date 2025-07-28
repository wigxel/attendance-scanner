import React, { useState } from "react";
import { Dispatch, SetStateAction } from "react";
import { DateRange, DayPicker } from "react-day-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
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
import ReservationNavigationComponent from "./reservationNavigation";
import Toast from "./toast";

interface SchedulerComponentProps {
  setStep: Dispatch<SetStateAction<string>>;
  setSelectedDate: Dispatch<SetStateAction<DateRange | undefined>>;
  selectedDate: DateRange | undefined;
  duration: string;
  setDuration: Dispatch<SetStateAction<string>>;
  numberOfSeats: number;
  setNumberOfSeats: Dispatch<SetStateAction<number>>;
}

export default function SchedulerComponent({
  setStep,
  setSelectedDate,
  selectedDate,
  duration,
  setDuration,
  numberOfSeats,
  setNumberOfSeats,
}: SchedulerComponentProps) {
  const [dateFilter, setDateFilter] = useState("dateAvailable");
  const [timeFilter, setTimeFilter] = useState("timeAvailable");
  const [isOpen, setIsOpen] = useState(false); // dropdown toggle state
  const [isCustom, setIsCustom] = useState(false); //state for custom time

  // const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();

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
  // confirms that all necessary fields are filled before loading the next component
  // fields date, number of seats, time
  const handleNextStep = () => {
    if (duration === "" || selectedDate === undefined || numberOfSeats === 0) {
      Toast({ type: "error", message: "All fields must be filled." });
      return false;
    } else {
      return setStep("seatReservation");
    }
  };

  return (
    <section className="w-full h-fit flex flex-col justify-center items-center p-4 xl:p-0 mt-38 xl:mt-18">
      {/* sets the next component to render */}
      <ReservationNavigationComponent step="scheduler" setStep={setStep} />
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
          <DayPicker
            mode="range"
            selected={selectedDate}
            onSelect={setSelectedDate}
            // footer={
            //     selected && selected.length > 0 ? `Selected: ${selected.map(d => d.toLocaleDateString()).join(', ')}` : "Pick a day."
            // }
            classNames={{
              day_selected: `!bg-(--primary) !text-white !rounded-sm`,
              day_disabled: `!bg-(--text-gray) !rounded-sm !border !border-(--primary)`,
              day: `hover:!rounded-sm w-8 h-8 hover:!bg-gray-200`,
            }}
          />
        </div>
      </div>

      {/* number of seats */}
      <div className="w-full flex justify-between items-center bg-(--background-gray) rounded-md p-3 mt-4">
        <div className="flex flex-col items-center">
          <span className="flex justify-start items-center text-xs text-(--text-gray)">
            <UsersRound className="w-6 h-4" />
            Choose Number of Seats
          </span>

          <span className="w-full text-[11px] text-(--text-gray) text-center">
            {6 - numberOfSeats} seats remaining
          </span>
        </div>

        <div className="flex items-center justify-between w-28 h-8 bg-(--background-gray) rounded-sm px-2">
          {/* number of seats */}

          {/* reduce number of seats */}
          <button
            type="button"
            className="w-8 h-8 flex justify-center items-center text-(--text-gray) bg-(--button-gray) rounded-sm hover:bg-gray-200"
            onClick={(e) => {
              e.preventDefault();
              if (numberOfSeats > 1) {
                setNumberOfSeats(numberOfSeats - 1);
              }
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
            onClick={(e) => {
              e.preventDefault();
              if (numberOfSeats < 6) {
                // assuming max seats is 6
                setNumberOfSeats(numberOfSeats + 1);
              }
            }}
          >
            <Plus />
          </button>
        </div>
      </div>

      {/* time */}
      <div
        className={
          isOpen === true
            ? "w-full h-fit relative mb-[250px]"
            : "w-full h-fit !mb-[110px]"
        }
      >
        <div className="w-full h-[50px] bg-(--background-gray) rounded-md relative flex items-center justify-between px-5 mt-4">
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <span className="flex items-center text-xs text-(--text-gray)">
              <Clock className="w-4 h-4 mr-1" />
              Choose Time
            </span>
            <DropdownMenuTrigger asChild>
              <button
                className="w-8 h-8 flex justify-center items-center text-(--text-gray) bg-(--button-gray) rounded-sm hover:bg-gray-200"
                aria-label="Customise options"
                onClick={() => setIsOpen(!isOpen)}
              >
                {isOpen === false ? <ChevronDown /> : <ChevronUp />}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuPortal>
              <DropdownMenuContent
                className="w-[335px] h-fit rounded-b-md p-4 bg-(--background-gray) will-change-[opacity,transform] data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade data-[side=right]:animate-slideLeftAndFade data-[side=top]:animate-slideDownAndFade"
                sideOffset={5}
                align="end"
                alignOffset={-20}
              >
                {/* time input selector option*/}
                <DropdownMenuItem
                  onClick={() => {
                    setIsCustom(false);
                  }}
                  className="w-full h-[31px] px-5 rounded-sm group relative flex select-none justify-between items-center  hover:bg-(--button-gray) text-xs leading-none text-violet11 outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[disabled]:text-mauve8 data-[highlighted]:text-violet1"
                >
                  All Day (9am - 5pm)
                  {/* time input selector */}
                  <input
                    type="radio"
                    value="allDay"
                    checked={!isCustom && duration === "9:00 - 17:00"}
                    onChange={() => {
                      setDuration("9:00 - 17:00");
                      setIsCustom(false);
                    }}
                  />
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    setIsCustom(true);
                  }}
                  className="w-full group flex flex-col relative h-fit select-none item-center text-xs leading-none text-violet11 outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[disabled]:text-mauve8 data-[highlighted]:text-violet1"
                >
                  <label className="w-full h-[31px] px-5 group relative select-none flex justify-between items-center hover:bg-(--button-gray) rounded-sm mb-4">
                    <span className="text-xs">Custom</span>

                    {/* time input selector */}
                    <button
                      type="button"
                      className={
                        isCustom === true
                          ? "w-3.5 h-3.5 flex justify-center items-center bg-white rounded-full border border-blue-600"
                          : "w-3.5 h-3.5 flex justify-center items-center bg-white rounded-full border border-gray-400"
                      }
                    >
                      <span
                        className={
                          isCustom === true
                            ? "w-2.5 h-2.5 bg-blue-600 rounded-full"
                            : "w-2.5 h-2.5 bg-white rounded-full"
                        }
                      ></span>
                    </button>
                  </label>

                  {/* time filter */}
                  <div
                    className={
                      isCustom === true
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
                        value={item.checker} //default checked filter value
                        checker={timeFilter}
                        onChange={setTimeFilter}
                      />
                    ))}
                  </div>

                  <div
                    className={isCustom ? "grid grid-cols-3 gap-1.5" : "hidden"}
                  >
                    {timeData.map((time, index) => (
                      <button
                        key={index}
                        type="button"
                        className={
                          "border hover:border-(--primary) w-24 h-8 text-xs font-medium rounded-sm" +
                          (duration === time.value
                            ? " bg-(--primary) text-white"
                            : "bg-(--button-gray) rounded-sm")
                        }
                        onClick={() => {
                          setDuration(time.value);
                        }}
                      >
                        {time.label}
                      </button>
                    ))}
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
        </div>
      </div>

      <button
        type="button"
        onClick={() => handleNextStep()}
        className="w-full h-8 text-xs font-semibold bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm flex justify-center items-center"
      >
        Proceed
      </button>
    </section>
  );
}
