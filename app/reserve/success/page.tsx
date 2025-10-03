"use client";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { usePaymentHandler } from "@/hooks/usePaymentHandler";

import Image from "next/image";
import CheckMark from "@/public/checkmark.svg";
import { LucideLoader } from "lucide-react";

export default function SuccessPage() {
  const { formatPrice, returnToHomepage } = usePaymentHandler();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking-id") as Id<"bookings">;

  const bookingDetails = useQuery(api.bookings.getBookingById, { bookingId });
  const seatId = bookingDetails?.seatId as Id<"seats">;
  const seat = useQuery(api.seats.getSeatById, { seatId });
  const timePeriodString = bookingDetails?.durationType;
  const selectedDate = new Date(bookingDetails?.startDate || "");
  const endDate = new Date(bookingDetails?.endDate || "");
  const price = bookingDetails?.amount || null;
  const { user } = useUser();

  if (user)
    if (bookingDetails === undefined) {
      return (
        <div className="flex justify-center items-center h-screen">
          <LucideLoader className="animate-spin" />
        </div>
      );
    }

  return (
    <div className="w-10/12 min-w-[340px] max-w-xl mx-auto mt-3 pt-6">
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
            <p className="text-right">Seat {seat?.seatNumber}</p>
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
    </div>
  );
}
