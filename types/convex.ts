import type { Doc } from "../convex/_generated/dataModel";
import type { PlanKey } from ".";

export type Booking = Omit<Doc<"bookings">, "planKey"> & {
  planKey?: PlanKey;
};

export type BookingV1 = Booking & {
  _v: "booking_v1";
};

export type BookingV2 = Booking & {
  _v: "booking_v2";
  planKey: PlanKey;
};

export type TaggedBooking = BookingV1 | BookingV2;

export type AccessPlan = Doc<"accessPlans"> & {
  key: PlanKey;
};
