import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatDateToLocalISO } from "@/lib/utils";
import {
  useBookingStore,
  setSelectedSeatId,
  setSelectedSeatNumber,
  setActiveTab,
} from "@/app/reserve/store";

interface Seat {
  _id: Id<"seats">;
  seatNumber: string | number;
  isBooked: boolean;
}

export const useSeats = () => {
  const { selectedDate, endDate, selectedSeatNumber } = useBookingStore();

  const availableSeats = useQuery(api.seats.getAllSeatsForDateRange, {
    startDate: selectedDate ? formatDateToLocalISO(selectedDate) : "",
    endDate: endDate ? formatDateToLocalISO(endDate) : "",
  });

  const isLoading = availableSeats === undefined;

  useEffect(() => {
    // Check if the selected seat has become occupied
    if (selectedSeatNumber && availableSeats) {
      const selectedSeat = availableSeats.find(
        (seat: Seat) => seat.seatNumber === selectedSeatNumber,
      );
      if (selectedSeat && selectedSeat.isBooked) {
        setSelectedSeatNumber(null);
      }
    }
  }, [availableSeats, selectedSeatNumber]);

  const handleSeatClick = (seat: Seat): void => {
    setSelectedSeatNumber(seat.seatNumber);
    setSelectedSeatId(seat._id);
  };

  const proceedToPayment = () => {
    setActiveTab("payment");
  };

  return {
    seats: availableSeats || [],
    handleSeatClick,
    selectedSeatNumber,
    isLoading,
    proceedToPayment,
  };
};
