import { Schema } from "effect";
import { brand } from "effect/Schema";
import type { Doc } from "../convex/_generated/dataModel";
export * from "./convex";

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type DurationGroup = "day" | "week" | "month";

export type KnownPlanKey =
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "calendar_month";

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

export interface CurrencyAmount extends PaymentCurrencyAmount {
  denomination: string;
}

export interface Kobo extends CurrencyAmount {
  currency: "naira";
  denomination: "kobo";
}

export interface Naira extends CurrencyAmount {
  currency: "naira";
  denomination: "naira";
}
