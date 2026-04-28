"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { capitalize } from "effect/String";
import { BookTemplate } from "lucide-react";
import { BookingCard } from "./BookingCard";
import {
  EmptyState,
  EmptyStateConceal,
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateTitle,
} from "./empty-state";
import { Skeleton } from "./ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

export function AttendanceDrawer({
  bookingId,
  isOpen,
  onClose,
}: {
  bookingId: Id<"bookings"> | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const booking = useQuery(
    api.bookings.getBooking,
    bookingId ? { bookingId } : "skip",
  );

  const attendance = useQuery(
    api.myFunctions.getAttendanceForBooking,
    bookingId ? { bookingId } : "skip",
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Attendance Details</SheetTitle>
        </SheetHeader>

        {booking ? (
          <>
            <div className="px-4">
              <BookingCard booking={booking} />

              <p className="py-2 select-none text-xs text-center">
                Reservation by:&nbsp;
                <span className="font-medium">
                  {capitalize(booking.creator)}
                </span>
              </p>
            </div>

            <div className="my-4 border-t border-gray-200" />
          </>
        ) : null}

        <div className="mt-4 px-4">
          {!attendance ? (
            <div className="space-y-4">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : (
            <EmptyState isEmpty={attendance.length === 0}>
              <EmptyStateContent>
                <BookTemplate />
                <EmptyStateTitle>No Visits</EmptyStateTitle>
                <EmptyStateDescription className="text-center">
                  No attendance records found for this reservation. Scan a
                  customer with reservation to see log here.
                </EmptyStateDescription>
              </EmptyStateContent>

              <EmptyStateConceal>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Admitted By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell>
                          {new Date(record.timestamp).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{record.userName}</TableCell>
                        <TableCell>{record.admitterName}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </EmptyStateConceal>
            </EmptyState>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
