"use client";
import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { ConvexHttpClient } from "convex/browser";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { loadPaystackScript, formatDateToLocalISO } from "@/lib/utils";
import { useRouter } from "next/navigation";

import { LucideLoader } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import BookingCalendar from "@/components/BookingCalendar";
import SeatLayout from "@/components/SeatLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CheckMark from "@/public/checkmark.svg";
import Image from "next/image";

interface Seat {
  _id: Id<"seats">;
  seatNumber: string | number;
  isBooked: boolean;
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
  const handleDateProceed = (
    date: Date,
    endDate: Date,
    price: number,
    timePeriod: "day" | "week" | "month",
  ) => {
    const pickedDate = new Date(date);

    if (pickedDate.getDay() === 0) {
      alert("Please select another date. We're closed on Sundays");
    } else {
      setActiveTab("choose");
      setSelectedDate(date);
      setEndDate(endDate);
      setPrice(price);
      setTimePeriodString(timePeriod);
    }
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
          <PickScheduleTab
            onProceed={handleDateProceed}
            selectedDate={selectedDate}
          />
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

interface PickScheduleTabProps {
  onProceed: (
    date: Date,
    endDate: Date,
    price: number,
    timePeriod: "day" | "week" | "month",
  ) => void;
  selectedDate: Date | null;
}

function PickScheduleTab({ onProceed, selectedDate }: PickScheduleTabProps) {
  return (
    <div>
      <BookingCalendar onProceed={onProceed} selectedDate={selectedDate} />
    </div>
  );
}

interface PickSeatTabProps {
  selectedSeatNumber: string | number | null;
  setSelectedSeatNumber: (number: string | number | null) => void;
  setSelectedSeatId: (id: Id<"seats"> | null) => void;
  onProceed: () => void;
  startDate: Date | null;
  endDate: Date | null;
}

function PickSeatTab({
  selectedSeatNumber,
  setSelectedSeatNumber,
  setSelectedSeatId,
  onProceed,
  startDate,
  endDate,
}: PickSeatTabProps) {
  const availableSeats = useQuery(api.seats.getAllSeatsForDateRange, {
    startDate: formatDateToLocalISO(startDate) || "",
    endDate: formatDateToLocalISO(endDate) || "",
  });

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
  }, [availableSeats, selectedSeatNumber, setSelectedSeatNumber]);

  if (availableSeats === undefined) {
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

  if (!availableSeats) {
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
        seats={availableSeats}
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

interface MakePaymentTabProps {
  selectedSeatNumber: string | number | null;
  selectedSeatId: Id<"seats"> | null;
  selectedDate: Date | null;
  endDate: Date | null;
  price: number | null;
  timePeriodString: "day" | "week" | "month";
}

interface PaystackResponse {
  reference: string;
  trans: string;
  status: string;
  message: string;
  transaction: string;
  trxref: string;
  redirecturl: string;
}

function MakePaymentTab({
  selectedSeatNumber,
  selectedSeatId,
  selectedDate,
  endDate,
  price,
  timePeriodString,
}: MakePaymentTabProps) {
  type PaymentStatus = "pending" | "success" | "failed";

  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const { user } = useUser();
  const { getToken } = useAuth();
  const formatPrice = (price: number | null) => {
    if (price === null) return "N/A";
    return `₦${(price / 100).toLocaleString()}`;
  };

  const handleSuccessfulPayment = async (bookingId: Id<"bookings">) => {
    try {
      const token = await getToken({ template: "convex" });
      if (!token) {
        setPaymentMessage("Authentication error. Please log in again.");
        setPaymentStatus("failed");
        return;
      }
      httpClient.mutation(api.bookings.confirmBooking, { bookingId });

      setPaymentStatus("success");
      setPaymentMessage("Payment successful!");
    } catch (error) {
      setPaymentStatus("failed");
      setPaymentMessage("Booking failed.");
      console.error("Booking failed:", error);
    }
  };

  const handleCancelBooking = async (bookingId: Id<"bookings">) => {
    try {
      const token = await getToken({ template: "convex" });
      if (!token) {
        setPaymentMessage("Authentication error. Please log in again.");
        setPaymentStatus("failed");
        return;
      }
      httpClient.mutation(api.bookings.cancelBooking, { bookingId });

      setPaymentStatus("success");
      setPaymentMessage("Booking cancelled!");
    } catch (error) {
      setPaymentStatus("failed");
      setPaymentMessage("Booking cancellation failed.");
      console.error("Booking cancellation failed:", error);
    }
  };

  const handlePayment = async () => {
    try {
      if (selectedSeatId && selectedDate) {
        const token = await getToken({ template: "convex" });
        if (token) {
          httpClient.setAuth(token);

          const seatAvailability = await httpClient.query(
            api.seats.checkSeatAvailability,
            {
              seatId: selectedSeatId,
              startDate: formatDateToLocalISO(selectedDate) || "",
              durationType: timePeriodString,
            },
          );

          if (seatAvailability?.isAvailable === false) {
            setPaymentStatus("pending");
            setPaymentMessage(
              "Seat is no longer available for selected period",
            );
            return;
          }
        }
      }
      if (!user && !selectedDate && !selectedSeatId && !timePeriodString) {
        setPaymentStatus("pending");
        setPaymentMessage("Please select a user, date, seat, and time period.");
        return;
      }
      if (!user) {
        setPaymentStatus("pending");
        setPaymentMessage("Please login.");
        return;
      }
      if (!selectedDate) {
        setPaymentStatus("pending");
        setPaymentMessage("Please select a date.");
        return;
      }
      if (!selectedSeatId) {
        setPaymentStatus("pending");
        setPaymentMessage("Please select a seat.");
        return;
      }
      if (!timePeriodString) {
        setPaymentStatus("pending");
        setPaymentMessage("Please select a time period.");
        return;
      }

      const token = await getToken({ template: "convex" });
      if (!token) {
        setPaymentMessage("Authentication error. Please log in again.");
        setPaymentStatus("failed");
        return;
      }

      httpClient.setAuth(token);

      const bookingArgs = {
        userId: user?.id || "",
        startDate: formatDateToLocalISO(selectedDate) || "",
        seatIds: selectedSeatId ? [selectedSeatId] : [],
        durationType: timePeriodString,
      };

      const createBooking = await httpClient.mutation(
        api.bookings.createBooking,
        bookingArgs,
      );

      if (!createBooking.bookingIds || createBooking.bookingIds.length === 0) {
        setPaymentMessage("Failed to create booking.");
        setPaymentStatus("failed");
        return;
      }

      const bookingId = createBooking.bookingIds[0];

      const loaded = await loadPaystackScript();
      if (!loaded) {
        setPaymentStatus("pending");
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
        callback: (response: PaystackResponse) => {
          if (response.status === "success") {
            handleSuccessfulPayment(bookingId);
          } else {
            setPaymentStatus("failed");
            setPaymentMessage("Payment was not successful");
          }
        },
        onClose: () => {
          handleCancelBooking(bookingId);
          console.log("Booking was cancelled");
        },
      });

      paystack.openIframe();
    } catch (error) {
      setPaymentStatus("failed");
      setPaymentMessage("Payment failed!");
      console.error("Payment error:", error);
    }
  };

  const router = useRouter();

  return (
    <>
      {paymentStatus === "success" ? (
        // payment success page
        <div className="mt-3 pt-6">
          <div className="flex flex-col items-center gap-3">
            <span className="flex items-center justify-center bg-[#0000FF] w-16 h-16 rounded-full">
              <Image src={CheckMark} alt="Checkmark" className="w-7 h-5" />
            </span>
            <h2 className="text-center font-bold text-3xl px-3">
              You have successfully reserved your seat
            </h2>
          </div>
          <div className="mt-6 p-6 flex flex-col gap-6 shadow rounded-md">
            <div className="flex flex-col gap-3">
              <span className="flex flex-wrap items-center justify-between">
                <p className="text-[#72A0A0]">Name</p>
                <p>{user?.fullName}</p>
              </span>
              <span className="flex flex-wrap items-center justify-between">
                <p className="text-[#72A0A0]">Email</p>
                <p>{user?.emailAddresses[0].emailAddress}</p>
              </span>
            </div>
            <hr className="border-t-2 border-gray-300 w-full border-dashed" />
            <div className="flex flex-col gap-3">
              <span className="flex items-center justify-between">
                <p className="text-[#72A0A0]">Duration</p>
                <span>
                  <p>{timePeriodString === "day" && "1 day"}</p>
                  <p>{timePeriodString === "week" && "6 days"}</p>
                  <p>{timePeriodString === "month" && "24 days"}</p>
                </span>
              </span>
              <span className="flex items-center justify-between">
                <p className="text-[#72A0A0]">Seat No.</p>
                <p className="text-right">Seat {selectedSeatNumber}</p>
              </span>
              <span className="flex items-center justify-between">
                <p className="text-[#72A0A0]">Reservation Start Date</p>
                <p className="text-right">{selectedDate?.toDateString()}</p>
              </span>
              <span className="flex items-center justify-between">
                <p className="text-[#72A0A0]">Reservation End Date</p>
                <p className="text-right">{endDate?.toDateString()}</p>
              </span>
              <span className="flex items-center justify-between">
                <p className="text-[#72A0A0]">Amount</p>
                <p className="text-right">{formatPrice(price)}</p>
              </span>
            </div>
            <button
              onClick={() => router.push("/")}
              className="bg-[#0000FF] text-white font-semibold px-4 py-2 rounded-md hover:bg-[#3333FF] transition-colors duration-300 cursor-pointer"
            >
              Return to Homepage
            </button>
          </div>
          {/* payment success page end */}
        </div>
      ) : (
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
              <p>
                {paymentStatus == "pending" || paymentStatus == "failed"
                  ? "Not Paid"
                  : "Paid"}
              </p>
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
                  paymentStatus != "pending" && paymentStatus != "failed"
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
            className="bg-[#0000FF] hover:bg-[#3333FF] transition-colors duration-300 font-semibold text-white p-3 w-full rounded-lg cursor-pointer"
          >
            Pay Now
          </button>
        </div>
      )}
    </>
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
