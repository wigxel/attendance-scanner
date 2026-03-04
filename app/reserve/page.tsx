"use client";
import { DestroyFutureStateOnReserve } from "@/components/DestroyFutureState";
import { api } from "@/convex/_generated/api";
import { usePaymentHandler } from "@/hooks/usePaymentHandler";
import { useSeats } from "@/hooks/useSeats";
import { cn, formatTime } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { setActiveTab, useBookingStore } from "./store";

import BookingCalendar, { RangePreview } from "@/components/BookingCalendar";
import PendingBookingsModal from "@/components/PendingBookingsModal";
import SeatLayout from "@/components/SeatLayout";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, ChevronDown, LucideLoader } from "lucide-react";
import { motion } from "motion/react";
import React from "react";
import { SelectedSeats } from "./components/seats";

function BookingStepTrigger({
  value,
  label,
  stepNumber,
  isCompleted,
  isActive,
  alwaysBlue,
  canShowCheckmark = true,
}: {
  value: string;
  label: string;
  stepNumber: number;
  isCompleted: boolean;
  isActive: boolean;
  alwaysBlue?: boolean;
  canShowCheckmark?: boolean;
}) {
  const isCurrentlyActive = isActive;
  const showCheckmark = isCompleted && canShowCheckmark;

  return (
    <TabsTrigger
      value={value}
      className="flex-1 data-[state=active]:bg-transparent !shadow-none data-[state=inactive]:bg-transparent flex flex-col items-center justify-center p-0 gap-2 relative z-10"
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-300",
          showCheckmark
            ? "text-muted-foreground border"
            : "bg-gray-200 text-gray-500",
          isCurrentlyActive ? "bg-[#0000FF] text-white" : "",
        )}
      >
        {showCheckmark ? <Check size={16} /> : stepNumber}
      </div>
      <span
        className={`text-xs font-medium transition-colors duration-300
          ${isCurrentlyActive ? "text-gray-900" : "text-gray-500"}
        `}
      >
        {label}
      </span>
    </TabsTrigger>
  );
}

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
    <Card className="flex flex-col scanline-root max-w-lg mx-auto">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        defaultValue="booking"
        className="w-full gap-4 mt-4"
      >
        <TabsList className="relative w-full bg-transparent flex items-center justify-center pb-2">
          <BookingStepTrigger
            value="booking"
            label="Pick a Date"
            stepNumber={1}
            isCompleted={isBookingCompleted}
            isActive={isBookingActive}
            alwaysBlue={true} // First step always has active colors
          />
          <BookingStepTrigger
            value="choose"
            label="Choose Seat"
            stepNumber={2}
            isCompleted={isChooseCompleted}
            isActive={isChooseActive}
          />
          <BookingStepTrigger
            value="payment"
            label="Make Payment"
            stepNumber={3}
            isCompleted={false} // Payment step never shows a checkmark
            isActive={isPaymentActive}
            canShowCheckmark={false}
          />
          {/* progress bar */}
          <div className="absolute bottom-[-2px] left-0 h-px w-full bg-gray-200" />

          <div
            className={`absolute bottom-[-2px] left-0 h-px bg-[#0000FF] transition-all duration-300 ease-in-out rounded-r-full
              ${activeTab === "booking" && "w-1/3"}
              ${activeTab === "choose" && "w-2/3"}
              ${activeTab === "payment" && "w-full"}
            `}
          />
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
    </Card>
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

  const has_selected_a_seat = selectedSeatNumbers.length > 0;

  if (seats.length === 0) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex justify-center items-center">
        <p className="text-gray-600">No seats available</p>
      </div>
    );
  }

  return (
    <div className="p-3 mb-3 -mx-4 bg-gray-100 min-h-[400px] rounded-lg">
      <SeatLayout
        seats={seats}
        selectedSeatNumbers={selectedSeatNumbers}
        onSeatClick={handleSeatClick}
      />

      <motion.div
        initial={{ opacity: 0, y: "25%" }}
        animate={
          has_selected_a_seat
            ? { opacity: 100, y: "0" }
            : { opacity: 0, y: "25%" }
        }
        className="mt-4"
      >
        <SelectedSeats
          proceedButton={
            <Button disabled={!has_selected_a_seat} onClick={proceedToPayment}>
              Proceed
            </Button>
          }
        />
      </motion.div>
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
  const generateTicketsMutation = useMutation(api.bookings.generateTickets);

  const isExpiringSoon = timeRemaining < 60;
  const totalPrice = price ? price * selectedSeatNumbers.length : 0;

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

  React.useEffect(() => {
    if (paymentStatus === "success" && bookingId) {
      generateTicketsMutation({ bookingId })
        .then(() => {
          router.push(`/reserve/success?booking-id=${bookingId}`);
        })
        .catch((error) => {
          console.error(error);
        });
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
          <div className="border-gray-200 border rounded-lg p-4 flex flex-col gap-2">
            {user.fullName && (
              <div>
                <p className="text-sm text-gray-600">Full name</p>
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
          <div className="border-gray-200 border rounded-lg p-4 flex flex-col gap-6">
            <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse mb-2" />
            <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
          </div>
        )}

        <section className="flex flex-col gap-2">
          {selectedSeatNumbers.length > 0 && selectedDate ? (
            <RangePreview
              selectedDate={selectedDate}
              endDate={endDate}
              handleChangeDate={handleChangeDate}
            />
          ) : null}

          <SelectedSeats
            proceedButton={
              <Button variant="outline" onClick={handleChangeSeats}>
                Change Seats
              </Button>
            }
          />
        </section>

        <ul className="border-gray-200 divide-y divide-gray-200 border rounded-lg flex flex-col *:py-2 *:px-4">
          <li className="flex justify-between items-center">
            <p className="text-muted-foreground">Payment Status</p>
            <p>
              {paymentStatus === "pending" || paymentStatus === "failed"
                ? "Not Paid"
                : "Paid"}
            </p>
          </li>
          <li className="flex justify-between items-center">
            <p className="text-muted-foreground">Price per seat</p>
            <p>{formatPrice(price)}</p>
          </li>
          <li className="flex justify-between items-center">
            <p className="text-muted-foreground">Total Price</p>
            <p className="text-3xl text-black">{formatPrice(totalPrice)}</p>
          </li>
        </ul>

        <div>
          {paymentMessage && (
            <div
              className={`p-3 rounded-lg mb-4 text-center font-medium ${
                paymentStatus !== "pending" && paymentStatus !== "failed"
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
                    : "bg-blue-100 text-primary"
                }`}
              >
                {formatTime(timeRemaining)}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  isExpiringSoon ? "bg-red-500" : "bg-primary"
                }`}
                style={{ width: `${(timeRemaining / 600) * 100}%` }}
              />
            </div>
          </div>
        )}

        <Button size="lg" onClick={handlePayNowClick}>
          {paymentLoading ? (
            <LucideLoader
              size={"1.5rem"}
              strokeWidth={1}
              className="animate animate-spin"
            />
          ) : (
            "Pay Now"
          )}
        </Button>
      </div>
    </>
  );
}

export default function ReservePage() {
  return (
    <>
      <DestroyFutureStateOnReserve />
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
