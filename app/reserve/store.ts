import type { Id } from "@/convex/_generated/dataModel";
import { create } from "zustand";

interface BookingState {
  activeTab: string;
  selectedDate: Date | null;
  endDate: Date | null;
  price: number | null;
  selectedSeatNumber: string | number | null;
  selectedSeatId: Id<"seats"> | null;
  timePeriodString: "day" | "week" | "month";
  bookingId: Id<"bookings"> | null;
}

export const useBookingStore = create<BookingState>(() => ({
  activeTab: "booking",
  selectedDate: null,
  endDate: null,
  price: null,
  selectedSeatNumber: null,
  selectedSeatId: null,
  timePeriodString: "day",
  bookingId: null,
}));

export const setActiveTab = (tab: BookingState["activeTab"]) => {
  useBookingStore.setState({ activeTab: tab });
};

export const setSelectedDate = (date: BookingState["selectedDate"]) => {
  useBookingStore.setState({ selectedDate: date });
};

export const setEndDate = (date: Date) => {
  useBookingStore.setState({ endDate: date });
};

export const setPrice = (price: BookingState["price"]) => {
  useBookingStore.setState({ price: price });
};

export const setSelectedSeatNumber = (
  seatNumber: BookingState["selectedSeatNumber"],
) => {
  useBookingStore.setState({ selectedSeatNumber: seatNumber });
};

export const setSelectedSeatId = (seatId: BookingState["selectedSeatId"]) => {
  useBookingStore.setState({ selectedSeatId: seatId });
};

export const setTimePeriodString = (
  period: BookingState["timePeriodString"],
) => {
  useBookingStore.setState({ timePeriodString: period });
};

export const setBookingId = (bookingId: BookingState["bookingId"]) => {
  useBookingStore.setState({ bookingId: bookingId });
};

export const resetBookingState = () => {
  useBookingStore.setState({
    activeTab: "booking",
    selectedDate: null,
    endDate: null,
    price: null,
    selectedSeatNumber: null,
    selectedSeatId: null,
    timePeriodString: "day",
    bookingId: null,
  });
};
