import {
  addSelectedSeat,
  removeSelectedSeat,
  useBookingStore,
} from "@/app/reserve/store";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDateToLocalISO } from "@/lib/utils";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Seat {
  _id: Id<"seats">;
  seatNumber: string | number;
  isBooked: boolean;
}

export const useSeats = () => {
  const router = useRouter();
  const { selectedSeatNumbers } = useBookingStore();
  const selectedDateString = useBookingStore((state) => state.selectedDate);
  const selectedDate = selectedDateString ? new Date(selectedDateString) : null;
  const endDateString = useBookingStore((state) => state.endDate);
  const endDate = endDateString ? new Date(endDateString) : null;

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
    router.push("?tab=payment");
  };

  return {
    seats: availableSeats || [],
    handleSeatClick,
    selectedSeatNumbers,
    isLoading,
    proceedToPayment,
  };
};
