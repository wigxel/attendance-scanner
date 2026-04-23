"use client";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { usePaymentHandler } from "@/hooks/usePaymentHandler";
import { useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { resetBookingState } from "../store";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import CheckMark from "@/public/checkmark.svg";
import { LucideLoader } from "lucide-react";
import Image from "next/image";

export default function SuccessPage() {
  useEffect(() => {
    resetBookingState();
  }, []);

  const router = useRouter();
  const { formatPrice } = usePaymentHandler();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking-id") as Id<"bookings">;

  const bookingDetails = useQuery(api.bookings.getBooking, { bookingId });

  const seatIds = bookingDetails ? bookingDetails?.seatIds : [];

  const user = useQuery(api.myFunctions.getProfile);
  const seats = useQuery(api.seats.getSeatsById, { seatIds }) || [];

  const timePeriodString = bookingDetails?.durationType;
  const selectedDate = new Date(bookingDetails?.startDate || "");
  const endDate = new Date(bookingDetails?.endDate || "");
  const price = bookingDetails?.amount || null;

  if (bookingDetails === undefined && user === undefined) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LucideLoader className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-10/12 min-w-[340px] flex flex-col gap-6 max-w-lg mx-auto mt-3 pt-6">
      <div className="flex flex-col items-center gap-3">
        <span className="flex items-center justify-center bg-[#0000FF] w-16 h-16 rounded-full">
          <Image src={CheckMark} alt="Checkmark" className="w-7 h-5" />
        </span>

        <h2 className="text-center font-bold font-heading text-balance text-3xl px-3">
          You have successfully reserved your seat
        </h2>
      </div>

      <Card>
        <CardContent className="py-3 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className="flex flex-wrap items-center justify-between">
              <p className="text-muted-foreground">Name</p>
              <p>
                {user?.firstName} {user?.lastName}
              </p>
            </span>
            <span className="flex flex-wrap items-center justify-between">
              <p className="text-muted-foreground">Email</p>
              <p>{user?.email}</p>
            </span>
          </div>

          <hr className="border-t-2 border-gray-300 w-full border-dashed" />

          <div className="flex flex-col gap-3">
            <span className="flex items-center justify-between">
              <p className="text-muted-foreground">Duration</p>
              <span>
                <p>{timePeriodString === "day" && "1 day"}</p>
                <p>{timePeriodString === "week" && "6 days"}</p>
                <p>{timePeriodString === "month" && "24 days"}</p>
              </span>
            </span>
            <span className="flex items-center justify-between">
              <p className="text-muted-foreground">Seat No.</p>

              <div className="text-right">
                <p>
                  Seat{" "}
                  {seats.map((seat, index) => (
                    <span key={index}>
                      {seat?.seatNumber}
                      {index < seats.length - 1 && ", "}
                    </span>
                  ))}
                </p>
              </div>
            </span>
            <span className="flex items-center justify-between">
              <p className="text-muted-foreground">Reservation Start Date</p>
              <p className="text-right">{selectedDate?.toDateString()}</p>
            </span>
            <span className="flex items-center justify-between">
              <p className="text-muted-foreground">Reservation End Date</p>
              {timePeriodString === "day" ? (
                <p className="text-right">{selectedDate?.toDateString()}</p>
              ) : (
                <p className="text-right">{endDate?.toDateString()}</p>
              )}
            </span>
            <span className="flex items-center justify-between">
              <p className="text-muted-foreground">Amount</p>
              <p className="text-right">{formatPrice(price)}</p>
            </span>
          </div>

          <hr />

          <Button
            type="button"
            size="lg"
            onClick={() => {
              router.push("/account");
            }}
          >
            View bookings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
