import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  setEndDate,
  setPlanKey,
  setPrice,
  setSelectedDate,
  setTimePeriodString,
  useBookingStore,
} from "@/app/reserve/store";
import { api } from "@/convex/_generated/api";
import { getReservablePlans, resolvePlanKey } from "@/lib/booking-plans";
import { safeArray, safeInt } from "@/lib/data.helpers";
import { DurationGroupImpl } from "@/lib/date-range";
import { anomaly } from "@/lib/error.helpers";
import { calculateEndDate } from "@/lib/utils";
import type { AccessPlan } from "@/types/convex";

export const useBookingCalendarLogic = () => {
  const router = useRouter();
  const { timePeriodString, planKey } = useBookingStore();
  const selectedDateString = useBookingStore((state) => state.selectedDate);
  const selectedDate = selectedDateString ? new Date(selectedDateString) : null;

  const fullyBookedDates = useQuery(api.bookings.getFullyBookedDates);
  const accessPlans = useQuery(api.accessPlans.list) as
    | AccessPlan[]
    | undefined;

  // Auto-select the first reservable plan so Proceed works without opening the
  // dropdown, and so a planKey persisted from an older plan set is replaced.
  useEffect(() => {
    if (!accessPlans) {
      return;
    }

    const plans = getReservablePlans(accessPlans);

    if (plans.length === 0 || plans.some((plan) => plan.key === planKey)) {
      return;
    }

    const [firstPlan] = plans;

    setPlanKey(firstPlan.key);
    setTimePeriodString(
      DurationGroupImpl.resolveFromDays(firstPlan.no_of_days),
    );
  }, [accessPlans, planKey]);

  if (!accessPlans) {
    return {
      reserved: [] as { startDate: Date; endDate: Date }[],
      selectedDate,
      setSelectedDate: () => {},
      handleDateChange: () => {},
      formatDate: () => "",
      timePeriodString,
      planKey,
      reservablePlans: [] as AccessPlan[],
      handleTimePeriodChange: () => {},
      handleProceed: () => {},
    };
  }

  const reservablePlans = getReservablePlans(accessPlans);
  const activePlanKey = resolvePlanKey(planKey, reservablePlans);

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

  const handleTimePeriodChange = (key: string) => {
    setPlanKey(key);
    const plan = accessPlans.find((p) => p.key === key);
    if (plan) {
      setTimePeriodString(DurationGroupImpl.resolveFromDays(plan.no_of_days));
    }
  };

  const handleDateChange = (dates: Date[]) => setSelectedDate(dates[0] || null);

  const handleProceed = () => {
    if (!selectedDate) {
      return toast.error("Please select a date");
    }

    if (selectedDate.getDay() === 0) {
      return toast.info("Please select another date. We're closed on Sundays");
    }

    const currentPlan = accessPlans.find((p) => p.key === activePlanKey);
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
    planKey: activePlanKey,
    reservablePlans,
    handleTimePeriodChange,
    handleProceed,
  };
};
