import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useBookingStore, setActiveTab } from "@/app/reserve/store";
import { useEffect, useState } from "react";

interface PendingBooking {
  _id: Id<"bookings">;
  startDate: string;
  endDate: string;
  seats: {
    _id: Id<"seats">;
    _creationTime: number;
    createdAt: number;
    seatNumber: number;
    isBooked: boolean;
  }[];
  seatIds: Id<"seats">[];
  amount: number;
  durationType: "day" | "week" | "month" | undefined;
}

const PendingBookingsModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { bookingId, activeTab } = useBookingStore();
  const pendingBookings = useQuery(api.bookings.getUserPendingBookings);
  const expireBooking = useMutation(api.bookings.markBookingAsExpired);

  useEffect(() => {
    if (
      pendingBookings &&
      pendingBookings.length > 0 &&
      activeTab !== "payment" &&
      !bookingId
    ) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [pendingBookings, activeTab, bookingId]);

  const handleResume = (booking: PendingBooking) => {
    // Restore booking state to the store
    useBookingStore.setState({
      selectedDate: new Date(booking.startDate),
      endDate: new Date(booking.endDate),
      selectedSeatNumbers: booking.seats.map((s) => s.seatNumber.toString()),
      selectedSeatIds: booking.seatIds,
      price: booking.amount,
      bookingId: booking._id,
      timePeriodString: booking.durationType,
    });

    // Navigate to payment tab
    setActiveTab("payment");
    setIsOpen(false);
  };

  const handleCancel = async (bookingId: Id<"bookings">) => {
    await expireBooking({ bookingId });
    setIsOpen(false);
  };

  if (!isOpen || !pendingBookings || pendingBookings.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Pending Booking Found</h2>
        <p className="text-gray-600 mb-6">
          You have an incomplete booking. Would you like to complete the
          payment?
        </p>

        {pendingBookings.map((booking) => (
          <div key={booking._id} className="border rounded-lg p-4 mb-4">
            <div className="mb-3">
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-medium">
                {new Date(booking.startDate).toDateString()}
              </p>
            </div>
            <div className="mb-3">
              <p className="text-sm text-gray-600">Seats</p>
              <p className="font-medium">
                {booking.seats
                  .map(
                    (s: {
                      _id: Id<"seats">;
                      _creationTime: number;
                      createdAt: number;
                      seatNumber: number;
                      isBooked: boolean;
                    }) => s.seatNumber,
                  )
                  .join(", ")}
              </p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Amount</p>
              <p className="font-medium">
                ₦
                {(
                  (booking.amount * booking.seatIds.length) /
                  100
                ).toLocaleString()}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleResume(booking)}
                className="flex-1 bg-[#0000FF] text-white py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors cursor-pointer"
              >
                Resume Payment
              </button>
              <button
                onClick={() => handleCancel(booking._id)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingBookingsModal;
