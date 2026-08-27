import { Schema } from "effect";
import { brand } from "effect/Schema";
import type { Doc } from "../convex/_generated/dataModel";

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type DurationGroup = "day" | "week" | "month" | "full_month";

export type KnownPlanKey = "daily" | "weekly" | "monthly" | "calendar_month";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _PLAN_KEY = Schema.String.pipe(brand("PlanKey"));

export type PlanKey = KnownPlanKey | Schema.Schema.Type<typeof _PLAN_KEY>;

export type Position = { rowIndex: number; colIndex: number };

export type BookingWithDetails = Omit<
  Doc<"bookings">,
  "startDate" | "endDate"
> & {
  _id: string | undefined;
  startDate: string;
  endDate: string;
  seats: Doc<"seats">[];
  creator?: string;
  user: {
    id?: string;
    name: string;
    email: string | undefined;
  } | null;
};
