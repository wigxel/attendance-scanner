import type { Id } from "@/convex/_generated/dataModel";
import { create } from "zustand";

interface BookingState {
  activeTab: string;
  selectedDate: Date | null;
  endDate: Date | null;
  price: number | null;
  selectedSeatNumbers: (string | number)[];
  selectedSeatIds: Id<"seats">[];
  timePeriodString: "day" | "week" | "month";
  bookingId: Id<"bookings"> | null;
}

export const useBookingStore = create<BookingState>(() => ({
  activeTab: "booking",
  selectedDate: null,
  endDate: null,
  price: null,
  selectedSeatNumbers: [],
  selectedSeatIds: [],
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

export const setSelectedSeatNumbers = (seats: (string | number)[]) => {
  useBookingStore.setState({ selectedSeatNumbers: seats });
};

export const addSelectedSeat = (
  seatNumber: string | number,
  seatId: Id<"seats">,
) => {
  useBookingStore.setState((state) => ({
    selectedSeatNumbers: [...state.selectedSeatNumbers, seatNumber],
    selectedSeatIds: [...state.selectedSeatIds, seatId],
  }));
};

export const removeSelectedSeat = (seatNumber: string | number) => {
  useBookingStore.setState((state) => ({
    selectedSeatNumbers: state.selectedSeatNumbers.filter(
      (seat) => seat !== seatNumber,
    ),
    selectedSeatIds: state.selectedSeatIds.filter(
      (_, idx) => state.selectedSeatNumbers[idx] !== seatNumber,
    ),
  }));
};

export const setSelectedSeatId = (seatId: Id<"seats">) => {
  useBookingStore.setState((state) => ({
    selectedSeatIds: [...state.selectedSeatIds, seatId],
  }));
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
    selectedSeatNumbers: [],
    selectedSeatIds: [],
    timePeriodString: "day",
    bookingId: null,
  });
};
