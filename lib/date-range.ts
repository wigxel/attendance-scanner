import { Option, pipe } from "effect";
import type { DurationGroup, PlanKey } from "../types";
import { safeStr } from "./data.helpers";
import { DateParse } from "./date.helpers";
import { O } from "./fp.helpers";
import { calculateEndDate } from "./utils";

type DateOrString = Date | string;

type DateRange = {
  startDate: DateOrString;
  endDate: DateOrString;
};

export const DateRangeImpl = {
  deriveEndDate(durationType: DurationGroup | number, startDate: Date) {
    return pipe(
      DateRangeImpl.match(durationType, startDate),
      O.map((endDate) => endDate.toISOString()),
    );
  },

  match(durationType: DurationGroup | number, startDate: Date): O.Option<Date> {
    if (typeof durationType === "number") {
      return O.some(calculateEndDate(startDate, durationType));
    }

    if (durationType === "day") {
      return O.some(startDate);
    }

    if (durationType === "week") {
      return O.some(calculateEndDate(startDate, 6));
    }

    if (durationType === "month") {
      return O.some(calculateEndDate(startDate, 24));
    }

    // @todo: add month next
    return O.none();
  },

  parseRangeDate: (range: DateRange) => {
    return pipe(
      Option.all({
        startDate: DateParse.try(range?.startDate),
        endDate: DateParse.try(range?.endDate),
      }),
      O.getOrThrowWith(
        () => new Error(`Invalid date range. ${JSON.stringify(range)}`),
      ),
    );
  },

  /**
   * normalize and compare based on presets
   * @param params
   * @returns
   */
  compare(params: { bookingRange: DateRange; requestedRange: DateRange }) {
    const { bookingRange: bookingDate, requestedRange: requestedDate } = params;
    const parseDate = DateRangeImpl.parseRangeDate(requestedDate);
    const parsedBooking = DateRangeImpl.parseRangeDate(bookingDate);

    return {
      /** requested range is between available booking range. There's no intersection */
      isContained() {
        return (
          parsedBooking.endDate < parseDate.startDate ||
          parsedBooking.startDate > parseDate.endDate
        );
      },
    };
  },
};

const DURATION_TYPE_TO_PLAN_KEY = Object.freeze({
  day: "daily",
  week: "weekly",
  month: "monthly",
  full_month: "calendar_month",
} as Record<DurationGroup, PlanKey>);

export const PlanKeyManager = {
  /**@deprecated use resolveDurationGroup with no of days */
  mapPlanKey(duration_key: string): PlanKey {
    const safe_key = safeStr(duration_key) as DurationGroup;

    console.assert(
      safe_key in DURATION_TYPE_TO_PLAN_KEY,
      `>>> Important! Invalid duration key ${safe_key}<<<`,
    );

    return DURATION_TYPE_TO_PLAN_KEY[safe_key] as PlanKey;
  },
};

export const DurationGroupImpl = {
  valids: new Set(["day", "week", "month"]),

  resolveFromDays: (noOfDays: number) => {
    if (noOfDays > 0 && noOfDays <= 5) return "day";
    if (noOfDays >= 6 && noOfDays <= 23) return "week";
    if (noOfDays >= 24 && noOfDays < 365) return "month";

    throw new Error("No of Days must be greater than 0");
  },
};
