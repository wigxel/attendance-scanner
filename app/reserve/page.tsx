"use client";
import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { ConvexHttpClient } from "convex/browser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { loadPaystackScript } from "@/lib/utils";

import { LucideLoader } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import BookingCalendar from "@/components/BookingCalendar";
import SeatLayout from "@/components/SeatLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Seat {
  _id: Id<"seats">;
  seatNumber: string | number;
  isOccupied: boolean;
}

const CONFIG = {
  paystackPublicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
};

const httpClient = new ConvexHttpClient(CONFIG.convexUrl);

function Content() {
  const [activeTab, setActiveTab] = useState("booking");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<
    string | number | null
  >(null);
  const [selectedSeatId, setSelectedSeatId] = useState<Id<"seats"> | null>(
    null,
  );
  const [timePeriodString, setTimePeriodString] = useState<
    "day" | "week" | "month"
  >("day");

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  const handleProceed = (
    date: Date,
    endDate: Date,
    price: number,
    timePeriod: "day" | "week" | "month",
  ) => {
    setActiveTab("choose");
    setSelectedDate(date);
    setEndDate(endDate);
    setPrice(price);
    setTimePeriodString(timePeriod);
  };
  const handleSeatProceed = () => {
    setActiveTab("payment");
  };

  return (
    <div className="bg-white flex flex-col scanline-root max-w-lg mx-auto p-6 pb-14 rounded-2xl">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        defaultValue="booking"
        className="w-full"
      >
        <TabsList className="w-full">
          <TabsTrigger value="booking" className="cursor-pointer">
            Pick a Date
          </TabsTrigger>
          <TabsTrigger value="choose" className="cursor-pointer">
            Choose Seat
          </TabsTrigger>
          <TabsTrigger value="payment" className="cursor-pointer">
            Make Payment
          </TabsTrigger>
        </TabsList>
        <TabsContent value="booking">
          <PickScheduleTab onProceed={handleProceed} />
        </TabsContent>
        <TabsContent value="choose">
          <PickSeatTab
            selectedSeatNumber={selectedSeatNumber}
            setSelectedSeatNumber={setSelectedSeatNumber}
            setSelectedSeatId={setSelectedSeatId}
            onProceed={handleSeatProceed}
            startDate={selectedDate}
            endDate={endDate}
          />
        </TabsContent>
        <TabsContent value="payment">
          <MakePaymentTab
            selectedSeatNumber={selectedSeatNumber}
            selectedSeatId={selectedSeatId}
            selectedDate={selectedDate}
            endDate={endDate}
            price={price}
            timePeriodString={timePeriodString}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PickScheduleTab({
  onProceed,
}: {
  onProceed: (
    date: Date,
    endDate: Date,
    price: number,
    timePeriod: "day" | "week" | "month",
  ) => void;
}) {
  return (
    <div>
      <BookingCalendar onProceed={onProceed} />
    </div>
  );
}

function PickSeatTab({
  selectedSeatNumber,
  setSelectedSeatNumber,
  setSelectedSeatId,
  onProceed,
  startDate,
  endDate,
}: {
  selectedSeatNumber: string | number | null;
  setSelectedSeatNumber: (number: string | number | null) => void;
  setSelectedSeatId: (id: Id<"seats"> | null) => void;
  onProceed: () => void;
  startDate: Date | null;
  endDate: Date | null;
}) {
  const seatsQuery = useQuery(api.seats.getAllSeats);
  const availableSeats = useQuery(api.seats.getAllSeatsForDateRange, {
    startDate: startDate?.toISOString().split("T")[0] || "",
    endDate: endDate?.toISOString().split("T")[0] || "",
  });

  console.log("Start Date:", startDate?.toISOString().split("T")[0]);
  console.log("End Date:", endDate?.toISOString().split("T")[0]);
  console.log("Available Seats:", availableSeats);

  const [seats, setSeats] = useState<Seat[] | null | undefined>(null);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeats = async () => {
      try {
        setSeats(seatsQuery);
      } catch (error) {
        console.error("Error fetching seats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSeats();
  }, [seatsQuery]);

  useEffect(() => {
    // Check if the selected seat has become occupied
    if (selectedSeatNumber && seats) {
      const selectedSeat = seats.find(
        (seat: Seat) => seat.seatNumber === selectedSeatNumber,
      );
      if (selectedSeat && selectedSeat.isOccupied) {
        setSelectedSeatNumber(null);
      }
    }
  }, [seats, selectedSeatNumber, setSelectedSeatNumber]);

  if (seats === undefined) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex justify-center items-center">
        <div className="bg-white rounded-full p-4">
          <LucideLoader
            size={"2rem"}
            strokeWidth={1}
            className="animate animate-spin"
          />
        </div>
      </div>
    );
  }

  if (!seats) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex justify-center items-center">
        <p className="text-gray-600">No seats available</p>
      </div>
    );
  }

  const handleSeatSelect = (seat: Seat): void => {
    const newSeatNumber = seat.seatNumber;
    const newSeatId = seat._id;
    setSelectedSeatNumber(newSeatNumber);
    setSelectedSeatId(newSeatId);
  };

  return (
    <div className="p-3 bg-gray-100 min-h-screen rounded-lg">
      <SeatLayout
        seats={seats}
        onSeatSelect={handleSeatSelect}
        selectedSeatNumber={selectedSeatNumber}
      />
      {selectedSeatNumber && (
        <div className="bg-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Selected Seat:</p>
              <div className="text-sm text-gray-600 mt-1">
                <p>Seat {selectedSeatNumber}</p>
              </div>
            </div>
            <button
              onClick={onProceed}
              className="px-6 py-2 bg-[#0000FF] text-white rounded-lg font-medium hover:bg-blue-600 transition-colors cursor-pointer"
            >
              Proceed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MakePaymentTab({
  selectedSeatNumber,
  selectedSeatId,
  selectedDate,
  endDate,
  price,
  timePeriodString,
}: {
  selectedSeatNumber: string | number | null;
  selectedSeatId: Id<"seats"> | null;
  selectedDate: Date | null;
  endDate: Date | null;
  price: number | null;
  timePeriodString: "day" | "week" | "month";
}) {
  type PaymentStatus = "pending" | "success" | "failed";

  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const { user } = useUser();
  const { getToken } = useAuth();
  const formatPrice = (price: number | null) => {
    if (price === null) return "N/A";
    return `₦${(price / 100).toLocaleString()}`;
  };

  const handleSuccessfulPayment = async () => {
    try {
      const token = await getToken({ template: "convex" });
      if (!token) {
        setPaymentMessage("Authentication error. Please log in again.");
        setPaymentStatus("failed");
        return;
      }

      httpClient.setAuth(token);

      const bookingArgs = {
        userId: user?.id || "",
        startDate: selectedDate?.toISOString().split("T")[0] || "",
        seatIds: selectedSeatId ? [selectedSeatId] : [],
        durationType: timePeriodString,
      };

      const createBooking = await httpClient.mutation(
        api.bookings.createBooking,
        bookingArgs,
      );

      if (!createBooking.bookingIds || createBooking.bookingIds.length === 0) {
        setPaymentMessage("Booking failed after payment.");
        console.error(
          "Booking failed after successful payment:",
          createBooking,
        );
        return;
      }

      const bookingId = createBooking.bookingIds[0];
      httpClient.mutation(api.bookings.confirmBooking, { bookingId });

      setPaymentStatus("success");
      setPaymentMessage("Payment successful!");
    } catch (error) {
      setPaymentStatus("failed");
      setPaymentMessage("Booking failed after payment.");
      console.error("Booking failed after successful payment:", error);
    }
  };

  const handlePayment = async () => {
    try {
      if (!user && !selectedDate && !selectedSeatId && !timePeriodString) {
        setPaymentMessage("Please select a user, date, seat, and time period.");
        return;
      }
      if (!user) {
        setPaymentMessage("Please login.");
        return;
      }
      if (!selectedDate) {
        setPaymentMessage("Please select a date.");
        return;
      }
      if (!selectedSeatId) {
        setPaymentMessage("Please select a seat.");
        return;
      }
      if (!timePeriodString) {
        setPaymentMessage("Please select a time period.");
        return;
      }
      const loaded = await loadPaystackScript();
      if (!loaded) {
        setPaymentMessage(
          "Payment service failed to load. Please check your connection and try again.",
        );
        console.error(
          "Payment service failed to load. Please check your connection and try again.",
        );
        return;
      }

      // @ts-expect-error paystack
      const paystack = window.PaystackPop.setup({
        key: CONFIG.paystackPublicKey,
        email: user?.emailAddresses[0].emailAddress,
        amount: price,
        metadata: {
          name: user?.fullName,
          email: user?.emailAddresses[0].emailAddress,
          seatId: selectedSeatId,
          date: selectedDate?.toISOString(),
          endDate: endDate?.toISOString(),
          price: formatPrice(price),
        },
        // @ts-expect-error paystack
        callback: (response) => {
          if (response.status === "success") {
            handleSuccessfulPayment();
          } else {
            setPaymentStatus("failed");
            setPaymentMessage("Payment was not successful");
          }
        },
        onClose: () => {
          setPaymentMessage("Transaction was cancelled");
          console.log("Transaction was cancelled");
        },
      });

      paystack.openIframe();
    } catch (error) {
      setPaymentStatus("failed");
      setPaymentMessage("Payment failed!");
      console.error("Payment error:", error);
    }
  };
  return (
    <div className="bg-white my-8 flex flex-col gap-6">
      {user && (
        <div className="border-gray-200 border shadow rounded-lg p-4 flex flex-col gap-6">
          {user.fullName && (
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <div className="font-medium text-gray-900 mt-1">
                {user.fullName}
              </div>
            </div>
          )}
          {user.phoneNumbers.length > 0 && (
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <div className="font-medium text-gray-900 mt-1">
                {user.phoneNumbers[0]?.phoneNumber}
              </div>
            </div>
          )}
          {user.emailAddresses.length > 0 && (
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <div className="font-medium text-gray-900 mt-1">
                {user.emailAddresses[0].emailAddress}
              </div>
            </div>
          )}
        </div>
      )}
      {selectedSeatNumber && selectedDate ? (
        <div className="border-gray-200 border shadow rounded-lg p-4 flex flex-col gap-6">
          <div>
            <h5 className="text-xl font-bold text-[#72A0A0]">09:00am</h5>
            <p>{selectedDate.toDateString()}</p>
            <p>Seat {selectedSeatNumber}</p>
          </div>
          <div>
            <h5 className="text-xl font-bold text-[#72A0A0]">05:00pm</h5>
            <p>{endDate?.toDateString()}</p>
          </div>
        </div>
      ) : null}
      <div className="border-gray-200 border rounded-lg p-4 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <p className="text-[#72A0A0]">Payment Status</p>
          <p>{paymentStatus == "success" ? "Paid" : "Not Paid"}</p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[#72A0A0]">Price</p>
          <p>{formatPrice(price)}</p>
        </div>
      </div>

      <div>
        {paymentMessage && (
          <div
            className={`p-3 rounded-lg mb-4 text-center font-medium ${
              paymentStatus === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : paymentStatus === "failed"
                  ? "bg-red-100 text-red-800 border border-red-200"
                  : "bg-yellow-100 text-yellow-800 border border-yellow-200"
            }`}
          >
            {paymentMessage}
          </div>
        )}
      </div>

      <button
        onClick={handlePayment}
        className="bg-[#0000FF] font-semibold text-white p-3 w-full rounded-lg cursor-pointer"
      >
        Pay Now
      </button>
    </div>
  );
}

export default function ReservePage() {
  return (
    <>
      <title>Reserve | InSpace</title>
      <div className="fixed inset-0 z-0 scanline-container pointer-events-none" />
      <div className="z-[2] relative">
        <Header />

        <main className="px-4">
          <Content />
        </main>

        <Footer />
      </div>
    </>
  );
}
