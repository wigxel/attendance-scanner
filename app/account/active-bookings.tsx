import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // Assuming Shadcn UI path
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Calendar, Clock, Users } from "lucide-react";
import Link from "next/link";
import type React from "react"; // Added React import for React.ReactNode type

// Helper functions for formatting dates and duration types
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const getDurationText = (durationType: string): string => {
  return durationType.charAt(0).toUpperCase() + durationType.slice(1);
};

// Interface for booking data
interface Booking {
  _id: string;
  startDate: string;
  endDate: string;
  durationType: string;
  role: string;
  seats: Array<{ _id: string | number; seatNumber: string }>;
}

// --- Wrapper for common Card structure ---

/**
 * A wrapper component for consistent Card, CardHeader, and CardTitle structure.
 * It provides a title and an optional right-aligned content in the header.
 */
interface BookingsCardWrapperProps {
  title: string;
  headerRightContent?: React.ReactNode;
  children: React.ReactNode;
}

function BookingsCardWrapper({
  title,
  headerRightContent,
  children,
}: BookingsCardWrapperProps) {
  return (
    <Card className="flex flex-col gap-2 p-0">
      <CardHeader className="flex flex-row items-center justify-between px-6 pb-3 border-b">
        <CardTitle className="text-xl font-medium">{title}</CardTitle>
        {headerRightContent && (
          // The right content typically has text-sm text-gray-500, so we wrap it.
          // If more complex elements are needed, headerRightContent could render its own span/div.
          <span className="text-sm text-gray-500">{headerRightContent}</span>
        )}
      </CardHeader>

      {children}

      <CardFooter className="bg-gray-100 py-2 flex justify-center items-center">
        <Link href="/reserve?tab=booking">
          <Button variant="link" className="cursor-pointer">
            Reserve Seat
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

// --- Sub-components for better organization and readability ---

/**
 * Renders a loading state card.
 */
function LoadingBookingsCard() {
  return (
    <BookingsCardWrapper title="Bookings">
      <CardContent className="px-6 py-8 text-center">
        <div className="flex flex-col items-center">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </BookingsCardWrapper>
  );
}

/**
 * Renders an empty state card when no bookings are found.
 */
function EmptyBookingsCard() {
  return (
    <BookingsCardWrapper title="Bookings">
      <CardContent className="px-6 py-8 text-center">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">No bookings found</p>
        <p className="text-sm text-gray-500">
          Your bookings will appear here once you make a reservation.
        </p>
      </CardContent>
    </BookingsCardWrapper>
  );
}

/**
 * Displays the month and day of a booking's start date in a styled box.
 */
function BookingCalendarBox({ startDate }: { startDate: string }) {
  const date = new Date(startDate);
  return (
    <div className="flex flex-col items-center justify-center w-12 h-12 bg-gray-100 rounded-lg shrink-0 border border-gray-200">
      <span className="text-[10px] font-bold text-gray-500 uppercase">
        {date.toLocaleString("default", { month: "short" })}
      </span>
      <span className="text-lg font-bold text-gray-900 leading-none">
        {date.getDate()}
      </span>
    </div>
  );
}

/**
 * Displays the date/time details for a booking based on its duration type.
 */
function BookingDateTimeInfo({
  startDate,
  endDate,
  durationType,
}: Omit<Booking, "_id" | "role" | "seats">) {
  return (
    <div className="flex flex-col">
      {durationType === "day" ? (
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <p>09:00 AM - 05:00 PM</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>
            {formatDate(startDate)} - {formatDate(endDate)}
          </span>
        </div>
      )}
      <span className="text-xs text-gray-500">
        {getDurationText(durationType)}
      </span>
    </div>
  );
}

/**
 * Renders the appropriate action button or status badge based on booking role and seat count.
 */
function BookingActionStatus({
  role,
  seats,
  bookingId,
}: Pick<Booking, "role" | "seats"> & { bookingId: string }) {
  if (role === "purchaser" && seats.length > 1) {
    return (
      <Link
        href={`/share/${bookingId}`}
        className="flex items-center gap-2 px-3 py-1.5 bg-black hover:bg-gray-800 text-white text-xs font-medium rounded-full transition-all shadow-sm hover:shadow"
      >
        <Users className="w-3 h-3" />
        <span>Manage Group</span>
      </Link>
    );
  }

  if (role === "guest") {
    return (
      <div className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
        Guest
      </div>
    );
  }

  // Purchaser with single seat
  return (
    <div className="flex items-center gap-1 text-xs font-medium text-[#0000FF] bg-blue-50 px-2 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-[#0000FF]" />
      Confirmed
    </div>
  );
}

/**
 * Displays the reserved seat numbers for a booking.
 */
function BookingSeatNumbers({ seats }: Pick<Booking, "seats">) {
  return (
    <div className="flex flex-col gap-1 justify-between">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-1">
        {seats.length > 1 ? "Seats Reserved" : "Seat Number"}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {seats?.map((seat, index) => (
          <span
            key={seat?._id || index}
            className="text-sm font-mono font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200"
          >
            {seat?.seatNumber}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders an individual booking item.
 */
function BookingItem({ booking }: { booking: Booking }) {
  return (
    <div className="py-4 border-b border-gray-100 last:border-0 flex flex-col gap-3">
      <div className="group flex flex-col md:flex-row sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        {/* LEFT: Date and Time */}
        <div className="flex items-center gap-3 min-w-[180px]">
          <BookingCalendarBox startDate={booking.startDate} />
          <BookingDateTimeInfo
            startDate={booking.startDate}
            endDate={booking.endDate}
            durationType={booking.durationType}
          />
        </div>

        {/* RIGHT: Action Button / Status Badge */}
        <div className="flex items-center md:justify-end sm:min-w-[140px]">
          <BookingActionStatus
            role={booking.role}
            seats={booking.seats}
            bookingId={booking._id}
          />
        </div>
      </div>

      {/* Seat Numbers */}
      <BookingSeatNumbers seats={booking.seats} />
    </div>
  );
}

/**
 * Main component to display a list of active bookings.
 * Handles loading, empty, and display states.
 */
export function ActiveBookings() {
  const bookings = useQuery(api.bookings.getUserConfirmedBookings);

  if (bookings === undefined) {
    return <LoadingBookingsCard />;
  }

  if (!bookings || bookings.length === 0) {
    return <EmptyBookingsCard />;
  }

  return (
    <BookingsCardWrapper
      title="Active Bookings"
      headerRightContent={`${bookings.length} active`}
    >
      <CardContent className="px-6 py-3 flex flex-col gap-3 max-h-80 overflow-y-auto">
        {bookings.map((booking) => (
          <BookingItem key={booking._id} booking={booking} />
        ))}
      </CardContent>
    </BookingsCardWrapper>
  );
}
