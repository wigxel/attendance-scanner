import { Doc } from "../convex/_generated/dataModel";
import { DurationGroup, PlanKey } from ".";

export type BookingCheckV2 = {
  _v: "booking_check_v2";
  bookingId: string;
  planKey: PlanKey
  duration: number
}

export type BookingCheckV1 = {
  _v: "booking_check_v1",
  bookingId: string;
  durationType: DurationGroup
  duration: number
}

export type BookingCheck = BookingCheckV1 | BookingCheckV2;

export type Booking = Omit<Doc<"bookings">, "planKey"> & {
  planKey?: PlanKey
}

export type BookingV1 = Booking & {
  _v: "booking_v1";
}

export type BookingV2 = Booking & {
  _v: "booking_v2";
  planKey: PlanKey
}

export type TaggedBooking = BookingV1 | BookingV2;

export type AccessPlan = Doc<"accessPlans"> & {
  key: PlanKey
}
