import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useBookingStore, setActiveTab } from "@/app/reserve/store";
import { useEffect, useState, useRef } from "react";
import { formatTime } from "@/lib/utils";

interface PendingBooking {
  _id: Id<"bookings">;
  startDate: string;
  endDate: string;
  createdAt: number;
  seats: {
    _id: Id<"seats">;
    _creationTime: number;
    createdAt: number;
    seatNumber: number;
    isBooked: boolean;
  }[];
  seatIds: Id<"seats">[];
  pricePerSeat: number;
  amount: number;
  durationType: "day" | "week" | "month" | undefined;
}

const PendingBookingsModal = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const { bookingId } = useBookingStore();
  const pendingBookings = useQuery(api.bookings.getUserPendingBookings);
  const expireBooking = useMutation(api.bookings.markBookingAsExpired);

  // Track if this is the initial load
  const hasCheckedInitialBookings = useRef(false);
  const initialBookingIdRef = useRef<string | null>(null);

  // Only check for pending bookings on initial page load
  useEffect(() => {
    if (
      !hasCheckedInitialBookings.current &&
      pendingBookings &&
      pendingBookings.length > 0
    ) {
      hasCheckedInitialBookings.current = true;
      initialBookingIdRef.current = pendingBookings[0]._id;
      setIsOpen(true);

      // Calculate time remaining based on booking creation time
      const booking = pendingBookings[0];
      const createdTime = booking.createdAt;
      const expiryTime = createdTime + 10 * 60 * 1000;
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setTimeRemaining(remaining);
    } else if (
      pendingBookings &&
      pendingBookings.length === 0 &&
      !hasCheckedInitialBookings.current
    ) {
      // No pending bookings found on initial load
      hasCheckedInitialBookings.current = true;
    }
  }, [pendingBookings, bookingId]);

  useEffect(() => {
    if (!isOpen || timeRemaining <= 0) {
      if (timeRemaining === 0 && initialBookingIdRef.current) {
        expireBooking({
          bookingId: initialBookingIdRef.current as Id<"bookings">,
        });
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          setIsOpen(false);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timeRemaining, expireBooking]);

  const handleResume = (booking: PendingBooking) => {
    useBookingStore.setState({
      selectedDate: new Date(booking.startDate).toISOString(),
      endDate:
        booking.durationType === "day"
          ? new Date(booking.startDate).toISOString()
          : new Date(booking.endDate).toISOString(),
      selectedSeatNumbers: booking.seats.map((s) => s.seatNumber.toString()),
      selectedSeatIds: booking.seatIds,
      price: booking.pricePerSeat,
      bookingId: booking._id,
      timePeriodString: booking.durationType,
    });

    setActiveTab("payment");
    router.push(`?tab=payment`, { scroll: false });

    setIsOpen(false);
  };

  const handleCancel = async (bookingId: Id<"bookings">) => {
    await expireBooking({ bookingId });
    setIsOpen(false);
  };

  const isExpiringSoon = timeRemaining < 60; // Less than 1 minute

  if (!isOpen || !pendingBookings || pendingBookings.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Pending Booking Found</h2>
          <div
            className={`text-sm font-semibold px-3 py-1 rounded-full min-w-[57px] text-center ${
              isExpiringSoon
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {formatTime(timeRemaining)}
          </div>
        </div>

        <p className="text-gray-600 mb-6">
          You have an incomplete booking. Complete payment before it expires.
        </p>

        <div className="mb-6 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              isExpiringSoon ? "bg-red-500" : "bg-yellow-500"
            }`}
            style={{ width: `${(timeRemaining / 600) * 100}%` }}
          />
        </div>

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
                ₦{(booking.amount / 100).toLocaleString()}
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
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
