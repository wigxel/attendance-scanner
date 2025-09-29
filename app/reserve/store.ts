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
}

export const bookingStore = create<BookingState>((set) => ({
  activeTab: "booking",
  selectedDate: null,
  endDate: null,
  price: null,
  selectedSeatNumber: null,
  selectedSeatId: null,
  timePeriodString: "day",
}));

export const setActiveTab = (tab: BookingState["activeTab"]) => {
  bookingStore.setState({ activeTab: tab });
};

export const setSelectedDate = (date: ) => {
  bookingStore.setState({ selectedDate: date });
};

export const setEndDate = (date) => {
  bookingStore.setState({ endDate: date });
};

export const setPrice = (price) => {
  bookingStore.setState({ price: price });
};

export const setSelectedSeatNumber = (seatNumber) => {
  bookingStore.setState({ selectedSeatNumber: seatNumber });
};

export const setSelectedSeatId = (seatId) => {
  bookingStore.setState({ selectedSeatId: seatId });
};

export const setTimePeriodString = (period) => {
  bookingStore.setState({ timePeriodString: period });
};
