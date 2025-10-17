import { useRouter } from "next/navigation";
import { calculateEndDate } from "@/lib/utils";
import {
  useBookingStore,
  setSelectedDate,
  setTimePeriodString,
  setEndDate,
  setPrice,
} from "@/app/reserve/store";

export const useBookingCalendarLogic = () => {
  const router = useRouter();
  const { timePeriodString } = useBookingStore();
  const selectedDateString = useBookingStore((state) => state.selectedDate);
  const selectedDate = selectedDateString ? new Date(selectedDateString) : null;
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

  const handleTimePeriodChange = (value: "day" | "week" | "month") => {
    setTimePeriodString(value);
  };

  const handleDateChange = (dates: Date[]) => setSelectedDate(dates[0] || null);

  const handleProceed = () => {
    if (!selectedDate) return;

    if (selectedDate.getDay() === 0) {
      alert("Please select another date. We're closed on Sundays");
    } else {
      const calculatedEndDate = calculateEndDate(selectedDate, timePeriod);

      setEndDate(calculatedEndDate);
      setPrice(price);
      router.push("?tab=choose");
    }
  };
  return {
    reserved,
    selectedDate,
    setSelectedDate,
    handleDateChange,
    formatDate,
    timePeriodString,
    handleTimePeriodChange,
    handleProceed,
  };
};
