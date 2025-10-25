"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useBookingStore, setActiveTab } from "./store";
import { usePaymentHandler } from "@/hooks/usePaymentHandler";
import { useSeats } from "@/hooks/useSeats";
import { formatTime } from "@/lib/utils";

import { LucideLoader, Check } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import BookingCalendar from "@/components/BookingCalendar";
import SeatLayout from "@/components/SeatLayout";
import PendingBookingsModal from "@/components/PendingBookingsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeTab, selectedSeatIds, selectedDate } = useBookingStore();
  const [isReady, setIsReady] = useState(false);

  // Sync URL with active tab
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    router.push(`?tab=${newTab}`, { scroll: false });
  };

  // Initialize tab from URL on mount
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");

    if (!tabFromUrl) {
      router.push("?tab=booking", { scroll: false });
      return;
    }

    if (!["booking", "choose", "payment"].includes(tabFromUrl)) return;

    const { selectedDate, selectedSeatNumbers } = useBookingStore.getState();

    if (tabFromUrl === "choose" && !selectedDate) {
      router.push("?tab=booking", { scroll: false });
      return;
    }

    if (tabFromUrl === "payment" && selectedSeatNumbers.length === 0) {
      router.push("?tab=booking", { scroll: false });
      return;
    }

    setActiveTab(tabFromUrl);
    setIsReady(true);
  }, [searchParams, router]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const isBookingActive = activeTab === "booking";
  const isBookingCompleted = selectedDate && !isBookingActive;
  const isChooseActive = activeTab === "choose";
  const isChooseCompleted = selectedSeatIds.length > 0 && !isChooseActive;
  const isPaymentActive = activeTab === "payment";

  if (!isReady) {
    return null;
  }

  return (
    <div className="bg-white flex flex-col scanline-root max-w-lg mx-auto py-6 pb-14 rounded-2xl">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        defaultValue="booking"
        className="w-full gap-4"
      >
        <TabsList className="relative w-full bg-transparent flex items-center justify-center pb-2">
          <TabsTrigger
            value="booking"
            className="disabled:opacity-100 data-[state=active]:shadow-none flex-1 flex items-center justify-center gap-1 md:gap-2 text-xs md:text-base leading-0"
            disabled
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all duration-300 text-[#0000FF] border-2 border-solid border-[#0000FF]">
              {isBookingCompleted ? <Check strokeWidth={3} /> : "1"}
            </span>
            Pick a Date
          </TabsTrigger>
          <TabsTrigger
            value="choose"
            className="disabled:opacity-100 data-[state=active]:shadow-none  flex-1 flex items-center justify-center gap-1 md:gap-2 text-xs md:text-base leading-0"
            disabled
          >
            <span
              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all duration-300 border-2 border-solid ${isChooseActive || isChooseCompleted ? "text-[#0000FF] border-[#0000FF]" : "text-muted-foreground border-muted-foreground"}`}
            >
              {isChooseCompleted ? <Check strokeWidth={3} /> : "2"}
            </span>
            Choose Seat
          </TabsTrigger>
          <TabsTrigger
            value="payment"
            className={`disabled:opacity-100 data-[state=active]:shadow-none flex-1 flex items-center justify-center gap-1 md:gap-2 text-xs md:text-base leading-0`}
            disabled
          >
            <span
              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all duration-300 border-2 border-solid ${isPaymentActive ? "text-[#0000FF] border-[#0000FF]" : "text-muted-foreground border-muted-foreground"}`}
            >
              3
            </span>
            Make Payment
          </TabsTrigger>
          {/* progress bar */}
          <div className="absolute bottom-[-2px] left-0 h-1 w-full bg-gray-200" />
          <div
            className={`absolute bottom-[-2px] left-0 h-1 bg-[#0000FF] transition-all duration-300 ease-in-out rounded-r-full
              ${activeTab === "booking" && "w-1/3"}
              ${activeTab === "choose" && "w-2/3"}
              ${activeTab === "payment" && "w-full"}
            `}
          />
          {/**/}
        </TabsList>
        <TabsContent value="booking" className="px-6">
          <PickScheduleTab />
        </TabsContent>
        <TabsContent value="choose" className="px-6">
          <PickSeatTab />
        </TabsContent>
        <TabsContent value="payment" className="px-6">
          <MakePaymentTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PickScheduleTab() {
  return (
    <div>
      <BookingCalendar />
    </div>
  );
}

function PickSeatTab() {
  const {
    seats,
    isLoading,
    handleSeatClick,
    selectedSeatNumbers,
    proceedToPayment,
  } = useSeats();

  if (isLoading) {
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

  if (seats.length === 0) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex justify-center items-center">
        <p className="text-gray-600">No seats available</p>
      </div>
    );
  }

  return (
    <div className="p-3 bg-gray-100 min-h-screen rounded-lg">
      <SeatLayout
        seats={seats}
        selectedSeatNumbers={selectedSeatNumbers}
        onSeatClick={handleSeatClick}
      />
      {selectedSeatNumbers.length > 0 && (
        <div className="bg-white p-4 rounded-lg mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Selected Seats:</p>
              <div className="text-sm text-gray-600 mt-1">
                <p className="font-semibold text-gray-900">
                  {selectedSeatNumbers.join(", ")}
                </p>
                <p className="text-xs mt-1 text-gray-500">
                  {selectedSeatNumbers.length} seat
                  {selectedSeatNumbers.length !== 1 ? "s" : ""} selected
                </p>
              </div>
            </div>
            <button
              onClick={proceedToPayment}
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

function MakePaymentTab() {
  const router = useRouter();
  const { selectedSeatNumbers, price, bookingId } = useBookingStore();
  const selectedDateString = useBookingStore((state) => state.selectedDate);
  const selectedDate = selectedDateString ? new Date(selectedDateString) : null;
  const endDateString = useBookingStore((state) => state.endDate);
  const endDate = endDateString ? new Date(endDateString) : null;
  const {
    paymentMessage,
    paymentStatus,
    handlePayment,
    formatPrice,
    paymentLoading,
  } = usePaymentHandler();
  const { user } = useUser();
  const [showTimer, setShowTimer] = useState(false);
  const pendingBookings = useQuery(api.bookings.getUserPendingBookings);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds

  useEffect(() => {
    if (pendingBookings && pendingBookings.length > 0) {
      setShowTimer(true);
      const booking = pendingBookings[0];
      const createdTime = booking.createdAt;
      const expiryTime = createdTime + 10 * 60 * 1000;
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setTimeRemaining(remaining);
    }
  }, [pendingBookings]);

  useEffect(() => {
    if (paymentStatus === "success") {
      router.push(`/reserve/success?booking-id=${bookingId}`);
    }
  }, [paymentStatus, bookingId, router]);

  useEffect(() => {
    if (!showTimer || timeRemaining <= 0) {
      if (timeRemaining <= 0) setShowTimer(false); // Hide timer when it hits 0
      return;
    }

    if (paymentStatus === "failed" || paymentStatus === "success") {
      setShowTimer(false);
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimer, timeRemaining, paymentStatus]);

  const handleChangeDate = () => {
    router.push("?tab=booking", { scroll: false });
  };

  const handleChangeSeats = () => {
    router.push("?tab=choose", { scroll: false });
  };

  const handlePayNowClick = async () => {
    await handlePayment();
    if (pendingBookings && pendingBookings.length > 0) return;
    setTimeRemaining(600);
    setShowTimer(true);
  };

  const isExpiringSoon = timeRemaining < 60;
  const totalPrice = price ? price * selectedSeatNumbers.length : 0;

  return (
    <>
      <div className="p-4">
        <p className="text-sm text-gray-600">
          Complete payment within 10 minutes or your booking will be
          automatically canceled.
        </p>
      </div>
      <div className="bg-white mb-8 flex flex-col gap-6">
        {user ? (
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
        ) : (
          <div className="border-gray-200 border shadow rounded-lg p-4 flex flex-col gap-6">
            <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          </div>
        )}

        {selectedSeatNumbers.length > 0 && selectedDate ? (
          <div className="border-gray-200 border shadow rounded-lg p-4 flex gap-3">
            <div className="pt-2.5">
              <svg
                width="9"
                height="110"
                viewBox="0 0 9 110"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="4.5"
                  cy="4"
                  r="4"
                  className="fill-muted-foreground"
                />
                <path
                  d="M4.5 8L4.5 102"
                  strokeDasharray="2 2"
                  className="stroke-muted-foreground"
                />
                <circle
                  cx="4.5"
                  cy="106"
                  r="4"
                  className="fill-muted-foreground"
                />
              </svg>
            </div>
            <div className="flex flex-col gap-6">
              <div>
                <h5 className="text-xl font-bold text-muted-foreground">
                  09:00am
                </h5>
                <p>{selectedDate.toDateString()}</p>
                <p>Seat {selectedSeatNumbers.join(", ")}</p>
              </div>
              <div>
                <h5 className="text-xl font-bold text-muted-foreground">
                  05:00pm
                </h5>
                <p>{endDate?.toDateString()}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            onClick={handleChangeDate}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Change Date
          </button>
          <button
            onClick={handleChangeSeats}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Change Seats
          </button>
        </div>

        <div className="border-gray-200 border rounded-lg p-4 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Payment Status</p>
            <p>
              {paymentStatus == "pending" || paymentStatus == "failed"
                ? "Not Paid"
                : "Paid"}
            </p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Price per seat</p>
            <p>{formatPrice(price)}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Total Price</p>
            <p>{formatPrice(totalPrice)}</p>
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
        {showTimer && (
          <div className="border border-gray-200 rounded-lg p-4 mb-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">Time Remaining</h3>
              <div
                className={`text-lg font-bold px-3 py-1 rounded-full ${
                  isExpiringSoon
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-[#0000FF]"
                }`}
              >
                {formatTime(timeRemaining)}
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  isExpiringSoon ? "bg-red-500" : "bg-[#0000FF]"
                }`}
                style={{ width: `${(timeRemaining / 600) * 100}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handlePayNowClick}
          className="bg-[#0000FF] hover:bg-[#3333FF] transition-colors duration-300 font-semibold text-white p-3 w-full rounded-lg cursor-pointer flex items-center justify-center"
        >
          {paymentLoading ? (
            <LucideLoader
              size={"1.5rem"}
              strokeWidth={1}
              className="animate animate-spin"
            />
          ) : (
            "Pay Now"
          )}
        </button>
      </div>
    </>
  );
}

export default function ReservePage() {
  return (
    <>
      <title>Reserve | InSpace</title>
      <div className="fixed inset-0 z-0 scanline-container pointer-events-none" />

      <PendingBookingsModal />
      <div className="z-[2] relative">
        <Header />

        <main className="min-h-screen">
          <Content />
        </main>

        <Footer />
      </div>
    </>
  );
}
