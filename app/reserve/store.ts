import type { Id } from "@/convex/_generated/dataModel";
import { safeArray, safeObj } from "@/lib/data.helpers";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BookingState {
  activeTab: string;
  selectedDate: string | null;
  endDate: string | null;
  price: number | null;
  selectedSeatNumbers: string[];
  selectedSeatIds: Id<"seats">[];
  timePeriodString: "day" | "week" | "month";
  bookingId: Id<"bookings"> | null;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (_set) => ({
      activeTab: "booking",
      selectedDate: null,
      endDate: null,
      price: null,
      selectedSeatNumbers: [],
      selectedSeatIds: [],
      timePeriodString: "day",
      bookingId: null,
    }),
    {
      name: "booking-store",
      merge(persisted, current) {
        return {
          ...current,
          ...safeObj(persisted),
          selectedSeatNumbers: safeArray(
            safeObj(persisted).selectedSeatNumbers,
          ).map((e) => String(e)),
        };
      },
    },
  ),
);

export const setActiveTab = (tab: BookingState["activeTab"]) => {
  useBookingStore.setState({ activeTab: tab });
};

export const setSelectedDate = (date: Date | null) => {
  useBookingStore.setState({ selectedDate: date ? date.toISOString() : null });
};

export const setEndDate = (date: Date | null) => {
  useBookingStore.setState({ endDate: date ? date.toISOString() : null });
};

export const setPrice = (price: BookingState["price"]) => {
  useBookingStore.setState({ price: price });
};

export const setSelectedSeatNumbers = (seats: string[]) => {
  useBookingStore.setState({ selectedSeatNumbers: seats });
};

export const addSelectedSeat = (seatNumber_: string, seatId: Id<"seats">) => {
  const seatNumber = String(seatNumber_);

  useBookingStore.setState((state) => ({
    selectedSeatNumbers: [...state.selectedSeatNumbers, seatNumber],
    selectedSeatIds: [...state.selectedSeatIds, seatId],
  }));
};

export const removeSelectedSeat = (seatNumber_: string) => {
  const seatNumber = String(seatNumber_);

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
