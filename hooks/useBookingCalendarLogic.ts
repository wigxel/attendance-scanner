import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  setEndDate,
  setPrice,
  setSelectedDate,
  setTimePeriodString,
  useBookingStore,
} from "@/app/reserve/store";
import { api } from "@/convex/_generated/api";
import { safeArray, safeInt } from "@/lib/data.helpers";
import { anomaly } from "@/lib/error.helpers";
import { calculateEndDate } from "@/lib/utils";
import type { DurationType, KnownPlanKey } from "@/types";

export const useBookingCalendarLogic = () => {
  const router = useRouter();
  const { timePeriodString } = useBookingStore();
  const selectedDateString = useBookingStore((state) => state.selectedDate);
  const selectedDate = selectedDateString ? new Date(selectedDateString) : null;

  const fullyBookedDates = useQuery(api.bookings.getFullyBookedDates);
  const accessPlans = useQuery(api.accessPlans.list);

  if (!accessPlans) {
    return {
      reserved: [],
      selectedDate,
      setSelectedDate: () => {},
      handleDateChange: () => {},
      formatDate: () => "",
      timePeriodString,
      handleTimePeriodChange: () => {},
      handleProceed: () => {},
    };
  }

  const reserved: {
    startDate: Date;
    endDate: Date;
  }[] = safeArray(fullyBookedDates).map((dateStr: string) => ({
    startDate: new Date(dateStr),
    endDate: new Date(dateStr),
  }));

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

  const handleTimePeriodChange = (value: DurationType) => {
    setTimePeriodString(value);
  };

  const handleDateChange = (dates: Date[]) => setSelectedDate(dates[0] || null);

  const handleProceed = () => {
    if (!selectedDate) {
      return toast.error("Please select a date");
    }

    if (selectedDate.getDay() === 0) {
      return toast.info("Please select another date. We're closed on Sundays");
    }

    const getPlanByKey = (key: KnownPlanKey) =>
      accessPlans?.find((plan) => plan.key === key);

    const currentPlan = getPlanByKey(timePeriodString as KnownPlanKey);
    const timePeriod = safeInt(currentPlan?.no_of_days, 0);

    if (!currentPlan) {
      const error = new Error("Invalid plan provided");
      anomaly(error, { currentPlan });

      return toast.error(error.message, { description: error.message });
    }

    if (timePeriod === 0) {
      const error = new Error("Booking duration is too short");
      anomaly(error, { no_of_days: currentPlan?.no_of_days, timePeriod });

      return toast.error("Booking failed", { description: error.message });
    }
    console.log({ currentPlan });
    const price = currentPlan.price * 100;

    const calculatedEndDate = calculateEndDate(selectedDate, timePeriod);

    setEndDate(calculatedEndDate);
    setPrice(price);

    router.push("?tab=choose");
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
