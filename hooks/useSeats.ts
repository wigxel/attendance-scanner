import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatDateToLocalISO } from "@/lib/utils";
import {
  useBookingStore,
  addSelectedSeat,
  removeSelectedSeat,
  setActiveTab,
} from "@/app/reserve/store";

interface Seat {
  _id: Id<"seats">;
  seatNumber: string | number;
  isBooked: boolean;
}

export const useSeats = () => {
  const { selectedDate, endDate, selectedSeatNumbers } = useBookingStore();

  const availableSeats = useQuery(api.seats.getAllSeatsForDateRange, {
    startDate: selectedDate ? formatDateToLocalISO(selectedDate) : "",
    endDate: endDate ? formatDateToLocalISO(endDate) : "",
  });

  const isLoading = availableSeats === undefined;

  useEffect(() => {
    // check if any selected seats have become occupied
    if (selectedSeatNumbers.length > 0 && availableSeats) {
      const seatsToRemove: (string | number)[] = [];

      selectedSeatNumbers.forEach((seatNumber) => {
        const selectedSeat = availableSeats.find(
          (seat: Seat) => seat.seatNumber === seatNumber,
        );
        if (selectedSeat && selectedSeat.isBooked) {
          seatsToRemove.push(seatNumber);
        }
      });

      // remove any seats that became booked
      seatsToRemove.forEach((seatNumber) => {
        removeSelectedSeat(seatNumber);
      });
    }
  }, [availableSeats, selectedSeatNumbers]);

  const handleSeatClick = (seat: Seat): void => {
    // Toggle seat selection
    if (selectedSeatNumbers.includes(seat.seatNumber)) {
      removeSelectedSeat(seat.seatNumber);
    } else {
      addSelectedSeat(seat.seatNumber, seat._id);
    }
  };

  const proceedToPayment = () => {
    setActiveTab("payment");
  };

  return {
    seats: availableSeats || [],
    handleSeatClick,
    selectedSeatNumbers,
    isLoading,
    proceedToPayment,
  };
};
