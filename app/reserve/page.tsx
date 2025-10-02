"use client";
import { useUser } from "@clerk/nextjs";
import { useBookingStore, setActiveTab } from "./store";
import { usePaymentHandler } from "@/hooks/usePaymentHandler";
import { useSeats } from "@/hooks/useSeats";

import { LucideLoader } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import BookingCalendar from "@/components/BookingCalendar";
import SeatLayout from "@/components/SeatLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CheckMark from "@/public/checkmark.svg";
import Image from "next/image";

function Content() {
  const { activeTab } = useBookingStore();

  return (
    <div className="bg-white flex flex-col scanline-root max-w-lg mx-auto p-6 pb-14 rounded-2xl">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
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
    selectedSeatNumber,
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
        selectedSeatNumber={selectedSeatNumber}
        onSeatClick={handleSeatClick}
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
  const { selectedSeatNumber, selectedDate, endDate, price, timePeriodString } =
    useBookingStore();
  const {
    paymentMessage,
    paymentStatus,
    handlePayment,
    returnToHomepage,
    formatPrice,
  } = usePaymentHandler();
  const { user } = useUser();

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
              onClick={() => returnToHomepage()}
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
