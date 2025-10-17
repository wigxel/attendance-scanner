"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useBookingStore, setActiveTab } from "./store";
import { usePaymentHandler } from "@/hooks/usePaymentHandler";
import { useSeats } from "@/hooks/useSeats";

import Image from "next/image";
import { LucideLoader } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import BookingCalendar from "@/components/BookingCalendar";
import SeatLayout from "@/components/SeatLayout";
import PendingBookingsModal from "@/components/PendingBookingsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import DurationSymbol from "@/public/duration-symbol.svg";

function Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeTab } = useBookingStore();
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

  if (!isReady) {
    return null;
  }

  return (
    <div className="bg-white flex flex-col scanline-root max-w-lg mx-auto p-6 pb-14 rounded-2xl">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        defaultValue="booking"
        className="w-full"
      >
        <TabsList className="w-full">
          <TabsTrigger
            value="booking"
            className="cursor-pointer disabled:opacity-100"
            disabled
          >
            Pick a Date
          </TabsTrigger>
          <TabsTrigger
            value="choose"
            className="cursor-pointer disabled:opacity-100"
            disabled
          >
            Choose Seat
          </TabsTrigger>
          <TabsTrigger
            value="payment"
            className="cursor-pointer disabled:opacity-100"
            disabled
          >
            Make Payment
          </TabsTrigger>
        </TabsList>
        <TabsContent value="booking">
          <PickScheduleTab />
        </TabsContent>
        <TabsContent value="choose">
          <PickSeatTab />
        </TabsContent>
        <TabsContent value="payment">
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

  useEffect(() => {
    if (paymentStatus === "success") {
      router.push(`/reserve/success?booking-id=${bookingId}`);
    }
  }, [paymentStatus, bookingId, router]);

  const handleChangeDate = () => {
    router.push("?tab=booking", { scroll: false });
  };

  const handleChangeSeats = () => {
    router.push("?tab=choose", { scroll: false });
  };

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
            <div className="pt-3">
              <Image src={DurationSymbol} alt="" />
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

        <button
          onClick={handlePayment}
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
