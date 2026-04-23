"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { safeArray } from "@/lib/data.helpers";
import { useQuery } from "convex/react";
import { useState } from "react";
import { AttendanceDrawer } from "./AttendanceDrawer";
import { BookingCard } from "./BookingCard";
import { Skeleton } from "./ui/skeleton";
import { Id } from "@/convex/_generated/dataModel";

export function Reservations() {
  const bookings = useQuery(api.bookings.getAllBookings);
  const [selectedBookingId, setSelectedBookingId] = useState<Id<"bookings"> | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleCardClick = (bookingId: Id<"bookings">) => {
    setSelectedBookingId(bookingId);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedBookingId(null);
  };


  const {
    present,
    past
  } = bookings
      ? Object.groupBy(bookings, (booking) => {
        if (booking.status === "confirmed" || booking.status === "pending") {
          return "present";
        }
        if (booking.status === "expired" || booking.status === "cancelled") {
          return "past";
        }
        return "other"; // Fallback for any unhandled statuses, though not explicitly used below
      })
      : {};


  if (!bookings) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="present">
        <TabsList>
          <TabsTrigger value="present">Present</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value="present">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {safeArray(present).map((booking) => (
              <BookingCard key={booking._id} booking={booking} onClick={() => handleCardClick(booking._id)} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="past">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {safeArray(past).map((booking) => (
              <BookingCard key={booking._id} booking={booking} onClick={() => handleCardClick(booking._id)} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
      <AttendanceDrawer bookingId={selectedBookingId} isOpen={isDrawerOpen} onClose={handleDrawerClose} />
    </>
  );
}
