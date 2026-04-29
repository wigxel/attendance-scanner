import {
  setEndDate,
  setPrice,
  setSelectedDate,
  setTimePeriodString,
  useBookingStore,
} from "@/app/reserve/store";
import { api } from "@/convex/_generated/api";
import { calculateEndDate } from "@/lib/utils";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";

type AccessPlanKey = "daily" | "weekly" | "monthly";

const DURATION_TYPE_TO_PLAN_KEY: Record<string, AccessPlanKey> = {
  day: "daily",
  week: "weekly",
  month: "monthly",
};

const PLAN_KEY_TO_DURATION_TYPE: Record<AccessPlanKey, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
};

export const useBookingCalendarLogic = () => {
  const router = useRouter();
  const { timePeriodString } = useBookingStore();
  const selectedDateString = useBookingStore((state) => state.selectedDate);
  const selectedDate = selectedDateString ? new Date(selectedDateString) : null;

  const fullyBookedDates = useQuery(api.bookings.getFullyBookedDates);
  const accessPlans = useQuery(api.myFunctions.listAccessPlans);

  const getPlanByKey = (key: AccessPlanKey) =>
    accessPlans?.find((plan) => plan.key === key);

  const currentPlan = getPlanByKey(timePeriodString as AccessPlanKey);

  const timePeriod = currentPlan?.no_of_days ?? 0;
  const price = currentPlan?.price ?? 0; // in kobo

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
  }[] =
    fullyBookedDates?.map((dateStr: string) => ({
      startDate: new Date(dateStr),
      endDate: new Date(dateStr),
    })) || [];

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (setTimePeriodString as any)(DURATION_TYPE_TO_PLAN_KEY[value]);
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
